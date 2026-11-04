# Play Lost Pet Hero on your iPhone

You do not need the App Store, and you do not need to pay Apple, to play this on your own phone. These steps open the game in Xcode and press Run. Do not use Product → Archive, and do not upload a build.

The game is already built for the web. The iPhone app is that same game in a shell.

## One-time setup on your Mac

1. Install **Xcode** from the Mac App Store. Open it once and accept the license. If it asks to install extra tools, say yes.
2. Install **Node.js 22** or newer from https://nodejs.org (the LTS button).
3. Plug in your iPhone and tap Trust on the phone.

A free Apple ID is enough. Xcode will put the game on your phone for about a week at a time. When it expires, press Run again. You do not need the $99 developer program for this.

## Put the game on your phone

Open the Terminal app and paste this, then press Return. It downloads the game, builds it, and opens Xcode.

```bash
git clone https://github.com/gorillastocks/lost-pet-hero.git
cd lost-pet-hero
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:

1. At the top, click the blue project **App**, then the **App** target.
2. **Signing & Capabilities**: tick **Automatically manage signing**. In Team, choose your Apple ID. If no team is listed, add the Apple ID in Xcode → Settings → Accounts, then come back.
3. If Xcode says the bundle id is already used, change it slightly, for example `com.gorillastocks.lostpethero.sean`.
4. At the top, next to the play button, choose your iPhone (not a simulator, if you want the real phone).
5. Press the **Play** button.
6. The first time, the phone may say Untrusted Developer. On the phone open Settings → General → VPN & Device Management, tap your Apple ID, and tap Trust. Then press Play in Xcode again.

The game should open to the title screen, Lost Pet Hero.

## Check that it worked

- Title screen shows Easy and Normal.
- Airplane mode: the title still loads. The app does not need the internet.
- Tap Play, pick a picture on the job board, and walk with taps.
- After a reunion, force-quit the app and open it again. **Continue** should bring your coins back.

## When the game changes

```bash
cd lost-pet-hero
git pull
npm ci
npm run build
npx cap sync ios
```

Then press Play in Xcode again.

## Saves

On the iPhone, the game saves in the web view and also copies the save into the app's preferences, so it survives iOS clearing website data. There is no account and no iCloud sync in this version.

## Not yet

Do not submit this to the App Store. The $9.99 card in the game does not charge anyone. Buying the full game is not hooked up.
