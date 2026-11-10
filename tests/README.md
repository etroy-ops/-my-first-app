# Tests

`smoke.js` plays the game automatically in a headless, phone-sized Chromium browser
(360×640, 390×844 and 412×915) using simulated touches. It checks the title screen,
movement and collision, the camera, every mission, dialogue branches, the bag, saving
and loading, pause / mute / restart, both defeat screens, level completion, that
nothing overflows sideways, and that buttons are at least 44px.

    npm i -D playwright      # one-off, only needed for testing
    node tests/smoke.js

This is a **simulation**. It does not replace trying the game on a real phone:
real touch feel, real performance, sound and vibration can only be judged on a device.
