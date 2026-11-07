'use strict';

/*
 * Standalone BMW MGU ID7 speed-camera app.
 * Camera records are cached under the app data directory and refreshed from
 * the versioned public JSON feed when HTTPS connectivity is available.
 * GPS is read-only BMW SatellitePositioning. Voice/audio is intentionally off.
 */
const mgu = require('./kit/mgu');
const bundledDatabase = require('./camera-db.json');
const { CameraStore } = require('./camera-store');
const { BmwGps } = require('./gps');
const { ProximityWarnings } = require('./proximity');

const CITY_LABELS = {
    'yoshkar-ola': 'Йошкар-Ола',
    'moscow': 'Москва',
    'sochi': 'Сочи'
};
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

mgu.run({
    async start(ctx) {
        const { ui, settings, log, dataDir } = ctx;
        let city = String(settings.get('city') || 'yoshkar-ola');
        let index = 0;
        const store = new CameraStore({ dataDir, bundled: bundledDatabase });
        let database = store.loadLocal().database;
        const gps = new BmwGps();
        const proximity = new ProximityWarnings();
        let refreshInFlight = null;
        let lastAlert = 'Предупреждение: нет';

        function list() {
            return database.cities && Array.isArray(database.cities[city]) ? database.cities[city] : [];
        }
        function mappedCount() {
            return list().filter((camera) => typeof camera.lat === 'number' && isFinite(camera.lat) &&\n                typeof camera.lon === 'number' && isFinite(camera.lon)).length;
        }
        function show(id, value) {
            Promise.resolve(ui.text(id, String(value))).catch((error) => {
                log.warn('UI update ' + id + ': ' + error);
            });
        }
        function gpsStatus() {
            const snap = gps.snapshot();
            if (snap.fix) {
                const fix = snap.fix;
                show('GPS_STATUS', 'GPS BMW: координаты получены');
                show('GPS_POSITION', 'Координаты: ' + fix.lat.toFixed(6) + ', ' + fix.lon.toFixed(6) +
                    (fix.speedKmh === null ? '' : ' · ' + Math.round(fix.speedKmh) + ' км/ч'));
                show('GPS_ACCURACY', fix.accuracyM !== null ?
                    'Точность: около ' + fix.accuracyM.toFixed(1) + ' м' :
                    'Точность GST не получена — оповещения заблокированы');
                return;
            }
            const labels = {
                connecting: 'GPS BMW: подключение к SatellitePositioning…',
                subscribed: 'GPS BMW: подписка активна, ожидание спутникового фикса',
                unavailable: 'GPS BMW: интерфейс недоступен (' + (snap.errorCode || 'unknown') + ')',
                stale: 'GPS BMW: координаты устарели',
                stopped: 'GPS BMW: остановлен'
            };
            show('GPS_STATUS', labels[snap.state] || 'GPS BMW: ' + snap.state);
            show('GPS_POSITION', 'Координаты: нет актуального фикса');
            show('GPS_ACCURACY', 'Точность: не подтверждена');
        }
        function render(message) {
            const cameras = list();
            if (index >= cameras.length) index = 0;
            if (index < 0) index = Math.max(0, cameras.length - 1);
            show('CITY', 'Город: ' + (CITY_LABELS[city] || city));
            show('COUNT', 'Камер в базе: ' + cameras.length + ' · с координатами: ' + mappedCount());
            gpsStatus();
            show('ALERT', lastAlert);
            if (!cameras.length) {
                show('CAMERA', 'Для этого города записей пока нет');
                show('LIMIT', 'Ограничение: —');
                show('INFO', message || 'Локальная база загружена');
                return;
            }
            const camera = cameras[index];
            show('CAMERA', (index + 1) + '/' + cameras.length + ' · ' + camera.name);
            show('LIMIT', 'Ограничение: ' + (camera.limit ? camera.limit + ' км/ч' : 'не указано'));
            const dbStatus = 'База rev.' + database.revision + ' (' + store.source + ')';
            show('INFO', (message ? message + ' · ' : '') + dbStatus + ' · ' +
                (mappedCount() ? 'GPS-оповещения включены' : 'нет координат камер — оповещения пока невозможны'));
        }
        function processFix(snap) {
            gpsStatus();
            if (!snap || !snap.fix) return;
            const events = proximity.update(snap.fix, list());
            events.forEach((event) => {
                const label = event.stage === 1 ? 'Первая точка' : 'Повторное предупреждение';
                const text = label + ': камера через ' + event.distanceM + ' м — ' + event.camera.name;
                lastAlert = text;
                show('ALERT', text);
                log.warn('PROXIMITY_WARNING stage=' + event.stage +
                    ' distance=' + event.distanceM + ' speed=' + event.speedKmh +
                    ' camera=' + event.camera.id);
            });
        }
        async function refreshDatabase(reason) {
            if (refreshInFlight) return refreshInFlight;
            refreshInFlight = store.refresh().then((result) => {
                database = result.database;
                if (result.updated) {
                    index = 0;
                    proximity.reset();
                    log.info('Camera database updated to revision ' + database.revision);
                    render('База камер обновлена');
                } else if (result.error) {
                    log.info('Camera database update unavailable: ' + result.error);
                    if (reason === 'manual') render('Нет сети; используется сохранённая база');
                } else if (reason === 'manual') {
                    render('База уже актуальна');
                }
                return result;
            }).catch((error) => {
                log.warn('Camera database refresh failed: ' + error);
                if (reason === 'manual') render('Ошибка обновления; используется локальная база');
                return { updated: false, error: String(error), database };
            }).then((result) => {
                refreshInFlight = null;
                return result;
            });
            return refreshInFlight;
        }

        gps.on('change', (snap) => processFix(snap));
        gps.start();

        ui.onClick('BTN_PREV', () => {
            index--;
            render('Предыдущая камера');
        });
        ui.onClick('BTN_NEXT', () => {
            index++;
            render('Следующая камера');
        });
        ui.onClick('BTN_REFRESH', () => {
            refreshDatabase('manual');
        });
        settings.onChange((key) => {
            if (key !== 'city') return;
            city = String(settings.get('city') || 'yoshkar-ola');
            index = 0;
            proximity.reset();
            render('Город изменён');
        });
        ui.onVisible((name, visible) => {
            if (name === 'MAIN' && visible) render('Локальная база готова');
        });

        render('Локальная база загружена; проверка обновлений…');
        // The bundled/cache copy is immediately usable; network refresh never blocks startup.
        refreshDatabase('startup');
        setInterval(() => refreshDatabase('scheduled'), REFRESH_INTERVAL_MS);
        log.info('Speed Camera Warning 0.3.0 started; database source=' + store.source +
            '; GPS proximity alerts enabled for geocoded cameras; voice disabled');
    }
});
