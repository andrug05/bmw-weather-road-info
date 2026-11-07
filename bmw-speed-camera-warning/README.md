# BMW Speed Camera Warning

Отдельное приложение для BMW MGU ID7. Package ID: `aurelm_speed_camera_warning`.

## Версия 0.1.0 — Readout prototype

На этом этапе собран минимальный OAP-прототип штатного голосового интерфейса BMW:

- отдельный пакет, manifest и package ID;
- регистрация через `ReadoutService.registerReadoutClient`;
- получение имени выделенного `ReadoutInstance`;
- отправка тестовой фразы через `ReadoutInstance.startReadout`;
- русский язык Readout: enum `RUSSISCH = 14`;
- английский язык: enum `ENGLISCH__UK = 2`;
- экранная кнопка проверки голоса и отображение ответа SOME/IP.

## Что пока не заявляется как готовое

- Фоновая озвучка при активной штатной навигации ещё не подтверждена.
- Источник координат автомобиля и его поведение при скрытом приложении ещё требуют проверки на MGU.
- База камер и расчёт предупреждений не включены в этот тестовый пакет.
- Приложение не меняет громкость радио и не использует неподтверждённый аудиоканал.

## Сборка

GitHub Actions workflow: `.github/workflows/speed-camera-release.yml`.

После успешной сборки будет опубликован отдельный архив `.tgz` и `.mgu` в GitHub Release с тегом `speed_camera_warning@0.1.0`.

Weather & Road Info — отдельное приложение; его исходники, runtime, зависимости и пакет не используются этим проектом.