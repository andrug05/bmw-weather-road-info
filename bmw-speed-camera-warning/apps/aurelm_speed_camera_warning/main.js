'use strict';

/*
 * Standalone BMW MGU ID7 speed-camera directory.
 * GPS is read-only from BMW SatellitePositioning SOME/IP, following the
 * bmw-kaluga-cameras integration pattern. No daemon or external GPS required.
 */
const mgu = require('./kit/mgu');
const database = require('./camera-db.json');
const { BmwGps } = require('./gps');

const CITY_LABELS = {
    'yoshkar-ola': 'Йошкар-Ола',
    'moscow': 'Москва',
    'sochi': 'Сочи'
};

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;
        let city = String(settings.get('city') || 'yoshkar-ola');
        let index = 0;
        const gps = new BmwGps();
        let gpsSnapshot = gps.snapshot();

        function list() {
            return Array.isArray(database[city]) ? database[city] : [];
        }

        function show(id, value) {
            Promise.resolve(ui.text(id, String(value))).catch((error) => {
                log.warn('UI update ' + id + ': ' + error);
            });
        }

        function gpsStatus() {
            const snap = gps.snapshot();
            gpsSnapshot = snap;
            if (snap.fix) {
                const fix = snap.fix;
                show('GPS_STATUS', 'GPS BMW: координаты получены');
                show('GPS_POSITION', 'Координаты: ' + fix.lat.toFixed(6) + ', ' + fix.lon.toFixed(6));
                show('GPS_ACCURACY', fix.accuracyM ?
                    'Точность: около ' + fix.accuracyM.toFixed(1) + ' м' :
                    'Точность: GST не получен — предупреждения по камерам пока заблокированы');
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
            show('COUNT', 'Записей в локальной базе: ' + cameras.length);
            gpsStatus();

            if (!cameras.length) {
                show('CAMERA', 'Для этого города проверенных камер пока нет');
                show('LIMIT', 'Ограничение: —');
                show('INFO', message || 'Выберите Йошкар-Олу или добавьте проверенные точки в camera-db.json');
                return;
            }

            const camera = cameras[index];
            show('CAMERA', (index + 1) + '/' + cameras.length + ' · ' + camera.name);
            show('LIMIT', 'Ограничение: ' + (camera.limit ? camera.limit + ' км/ч' : 'не указано'));
            show('INFO', (camera.type || 'Камера') + ' · ' + (camera.note || 'Локальная запись'));
        }

        gps.on('change', () => {
            gpsSnapshot = gps.snapshot();
            gpsStatus();
        });
        gps.start();

        ui.onClick('BTN_PREV', () => {
            index--;
            render('Предыдущая запись');
        });
        ui.onClick('BTN_NEXT', () => {
            index++;
            render('Следующая запись');
        });
        ui.onClick('BTN_REFRESH', () => {
            const selectedCity = String(settings.get('city') || 'yoshkar-ola');
            city = database[selectedCity] ? selectedCity : 'yoshkar-ola';
            index = 0;
            render('Локальная база перечитана');
        });

        settings.onChange((key) => {
            if (key !== 'city') return;
            city = String(settings.get('city') || 'yoshkar-ola');
            index = 0;
            render('Город изменён');
        });

        ui.onVisible((name, visible) => {
            if (name === 'MAIN' && visible) render('GPS BMW подключается');
        });

        render('GPS BMW подключается');
        log.info('Speed Camera Warning 0.2.0 started; BMW SatellitePositioning GPS enabled');
    }
});
