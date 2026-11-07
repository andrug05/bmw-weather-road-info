'use strict';

const mgu = require('./kit/mgu');
const signals = require('./kit/signals');

const READOUT_SERVICE = 'de.bmw.infotainment.speech.readout.ReadoutService';
const READOUT_INSTANCE = 'de.bmw.infotainment.speech.readout.ReadoutInstance';
const CLIENT_UUID = 'aurelm-speed-camera-warning-readout-v1';

function feedbackCode(value) {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'object') return null;
    for (const key of ['ReadoutFeedbackCode', 'feedbackCode', 'code']) {
        if (typeof value[key] === 'number') return value[key];
    }
    return null;
}

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;
        let serviceProxy = null;
        let readoutProxy = null;
        let registered = false;
        let busy = false;

        function show(status, detail) {
            Promise.resolve(ui.text('STATUS', status)).catch(() => {});
            Promise.resolve(ui.text('DETAIL', detail)).catch(() => {});
        }

        async function ensureReadout() {
            if (readoutProxy && registered) return readoutProxy;

            if (!serviceProxy) {
                serviceProxy = await signals.proxy(READOUT_SERVICE, 'ReadoutServiceHMI');
            }

            const registration = await signals.call(
                serviceProxy,
                'registerReadoutClient',
                { uuid: CLIENT_UUID },
                7000
            );

            const code = feedbackCode(registration);
            if (code !== 0) {
                throw new Error('registerReadoutClient: ' +
                    (code === null ? JSON.stringify(registration) : 'feedback ' + code));
            }

            const instanceName = registration && registration.instanceName;
            if (!instanceName || typeof instanceName !== 'string') {
                throw new Error('BMW Readout did not return an instanceName: ' +
                    JSON.stringify(registration));
            }

            readoutProxy = await signals.proxy(READOUT_INSTANCE, instanceName);
            registered = true;
            return readoutProxy;
        }

        async function speakTest() {
            if (busy) return;
            busy = true;
            show('Readout: подключение…', 'Регистрация клиента штатного BMW Readout');
            try {
                const proxy = await ensureReadout();
                const language = String(settings.get('voice_language') || 'ru');
                const text = language === 'en'
                    ? 'Speed camera warning system. Voice test successful.'
                    : 'Проверка голосового оповещения. Система предупреждения о камерах запущена.';

                const result = await signals.call(proxy, 'startReadout', {
                    readoutObject: {
                        autoPlayNextElement: false,
                        genre: '',
                        nextElement: 0,
                        offboard: false,
                        previousElement: 0,
                        text,
                        textFromResource: 0,
                        textLanguage: language === 'en' ? 2 : 14
                    }
                }, 10000);

                const code = feedbackCode(result);
                if (code === 0) {
                    show('Readout: запрос принят', 'BMW вернул OK. Проверьте, прозвучала ли фраза.');
                } else {
                    show('Readout: ошибка', 'Ответ startReadout: ' + JSON.stringify(result));
                }
                log.info('Readout startReadout result: ' + JSON.stringify(result));
            } catch (error) {
                const message = error && error.message ? error.message : String(error);
                show('Readout: недоступен', message);
                log.warn('Readout voice test failed: ' + message);
            } finally {
                busy = false;
            }
        }

        ui.onClick('BTN_TEST_VOICE', speakTest);

        show('Readout: не проверен', 'Нажмите кнопку для проверки штатного голоса BMW');
        log.info('Speed Camera Warning 0.1.0 started; standalone Readout test mode');

        // Keep the registration alive for the lifetime of this OAP process.
        // Camera/GPS monitoring is deliberately not enabled until the vehicle
        // position source and background Readout behavior are verified.
    }
});