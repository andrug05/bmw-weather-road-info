'use strict';

/*
 * Standalone BMW MGU ID7 camera directory.
 * This release intentionally does not claim GPS proximity detection or voice
 * announcements: the vehicle-position SOME/IP interface has not yet been
 * identified and tested on the target head unit.
 */
const mgu = require('./kit/mgu');
const database = require('./camera-db.json');

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

        function list() {
            return Array.isArray(database[city]) ? database[city] : [];
        }

        function show(id, value) {
            Promise.resolve(ui.text(id, String(value))).catch((error) => {
                log.warn('UI update ' + id + ': ' + error);
            });
        }

        function render(message) {
            const cameras = list();
            if (index >= cameras.length) index = 0;
            if (index < 0) index = Math.max(0, cameras.length - 1);

            show('CITY', 'Город: ' + (CITY_LABELS[city] || city));
            show('COUNT', 'Записей в локальной базе: ' + cameras.length);
            show('GPS_STATUS', 'GPS: не подключён — автоматические предупреждения не работают');
            show('VOICE_STATUS', 'Голос: отключён — громкость автомобиля не меняется');

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
            if (name === 'MAIN' && visible) render('Справочник готов');
        });

        render('Справочник готов');
        log.info('Speed Camera Warning 0.1.0 started; offline directory mode');
    }
});
