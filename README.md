# Lost Pet Hero: Wildwood

A quiet portrait game for one player, about ages 5 to 12. You take a job in Emberhollow, follow clues through Wildwood, calm a scared pet, and walk them home. You cannot lose.

**Play:** https://gorillastocks.github.io/lost-pet-hero/

If that link says the page does not exist, GitHub Pages still needs to be switched on once. Open the repo, then Settings, then Pages. Under **Build and deployment**, choose **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**, and save. Wait about a minute and open the link again. Every later change on main publishes itself.

## On your iPhone, in the browser

Open the play link in Safari. Add it to your Home Screen if you want the full screen. It also works offline after the first load.

## On your iPhone, as an app

You need a Mac with Xcode. You do not submit anything to the App Store, and you do not pay Apple.

1. Install Xcode from the Mac App Store, and open it once.
2. Install Node.js 22 from https://nodejs.org.
3. Open Terminal and run:

```bash
git clone https://github.com/gorillastocks/lost-pet-hero.git
cd lost-pet-hero
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

4. In Xcode, select the **App** target, tick **Automatically manage signing**, and choose your Apple ID as the team.
5. Plug in your iPhone, choose it at the top of Xcode, and press the Play button.
6. If the phone says the developer is untrusted: Settings → General → VPN & Device Management → Trust.

More detail, including what to do if the bundle id is taken, is in [IOS_BUILD.md](IOS_BUILD.md).

## How to play

- Choose **Easy** or **Normal** on the title screen. You can change it later in Settings.
- Easy has glowing clues, a wide slow tap, spoken hints, and simpler puzzles.
- Normal has more clues, puzzles with several steps, and you work out the pet's favourite snack or tune.
- The job board has three picture cards. Taking one lends you the owner's item, which starts one heart.
- Tap the woods to walk. There is no arrow pointing at the pet. Read the clues.
- Each treat or tune is one tap. Land it in the green. A miss hides the pet nearby, keeps the hearts, and gives the treat back.
- Common pets need 2 hearts, uncommon 3, rare 4.
- Walk the calm pet back to the town gate. You earn coins and kindness.
- A wild pet in the side grove stays in your sanctuary instead.
- Two rescues are free. The next one asks a grown-up a math question, then shows a **$9.99** full-game card. Nothing is charged. The card is a placeholder.

## On a computer

```bash
npm ci
npm run dev        # play at http://localhost:5173
npm test           # game rules
npm run build && npm run e2e   # desktop, iPhone-sized Chrome, and iPhone WebKit
```

Pictures are drawn in code. See [ATTRIBUTION.md](ATTRIBUTION.md).
