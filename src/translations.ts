import { MessageDescriptor } from "@cookbook/solid-intl";
import { NotificationType } from "./constants";
import { ScopeDescriptor } from "./types/primal";


export const account = {
  alreadyHaveAccount: {
    id: 'account.alreadyHaveAccount',
    defaultMessage: 'Már van Noszter fiókod?',
    description: 'Already have a Nostr accountlabel',
  },
  prominentNostriches: {
    id: 'actions.prominentNostriches',
    defaultMessage: 'Kiemelt Noszter felhasználók',
    description: 'Prominent Nostriches label',
  },
  follow: {
    id: 'actions.follow',
    defaultMessage: 'Követés',
    description: 'Follow button label',
  },
  unfollow: {
    id: 'actions.unfollow',
    defaultMessage: 'Követés leállítása',
    description: 'Unfollow button label',
  },
  followAll: {
    id: 'actions.followAll',
    defaultMessage: 'Összes követése',
    description: 'Follow all button label',
  },
  unfollowAll: {
    id: 'actions.unfollowAll',
    defaultMessage: 'Összes leállítása',
    description: 'Unfollow all button label',
  },
  followFailed: {
    id: 'account.followFailed',
    defaultMessage: 'Nem sikerült a követés, valószínűleg hálózati hiba miatt. Próbáld újra!',
    description: 'Feedback to user that the follow action has failed',
  },
  unfollowFailed: {
    id: 'account.unfollowFailed',
    defaultMessage: 'Nem sikerült a leállítás, valószínűleg hálózati hiba miatt. Próbáld újra!',
    description: 'Feedback to user that the unfollow action has failed',
  },
  needToLogin: {
    id: 'account.needToLogin',
    defaultMessage: 'Be kell jelentkezned ehhez a művelethez.',
    description: 'Message to user that an action cannot be preformed without a public key',
  },
  createNewDescription: {
    id: 'account.createNewDescription',
    defaultMessage: 'Új vagy a Noszteren? Hozd létre a fiókodat most, és csatlakozz ehhez a varázslatos helyhez! Gyorsan és egyszerűen!',
    description: 'Label inviting users to join Nostr',
  },
  create: {
    title: {
      id: 'settings.account.title',
      defaultMessage: 'Fiók létrehozása',
      description: 'Title of the create account page',
    },
    descriptions: {
      step_one: {
        id: 'settings.account.descriptions.step_one',
        defaultMessage: 'Kezdjük az alapokkal! Csak a felhasználónév szükséges!',
        description: 'Description on step one',
      },
      step_two: {
        id: 'settings.account.descriptions.step_two',
        defaultMessage: 'Mesélj magadról egy kicsit! Minden ezen az oldalon opcionális!',
        description: 'Description on step two',
      },
      step_three: {
        id: 'settings.account.descriptions.step_three',
        defaultMessage: 'Találtunk néhány Noszter fiókot, amelyeket követhetsz:',
        description: 'Description on step three',
      },
    }
  },
};

export const login = {
  title: {
    id: 'login.title',
    defaultMessage: 'Bejelentkezés',
    description: 'Login ',
  },
  description: {
    id: 'login.description',
    defaultMessage: 'Add meg a Noszter privát kulcsodat (nsec kezdetű):',
    description: 'Label describing the login proccess',
  },
  invalidNsec: {
    id: 'login.invalidNsec',
    defaultMessage: 'Adj meg egy érvényes Noszter privát kulcsot!',
    description: 'Label informing the user of an invalid nsec key',
  },
};

export const pin = {
  title: {
    id: 'pin.title',
    defaultMessage: 'PIN létrehozása',
    description: 'Create Pin modal title',
  },
  description: {
    id: 'pin.description',
    defaultMessage: 'Adj meg egy PIN-kódot a fiókod védelméhez! Ezt minden belépéskor meg kell adnod a Primal webappban.',
    description: 'Label describing what the pin is used for',
  },
  enter: {
    id: 'pin.enter',
    defaultMessage: 'Add meg a PIN-kódodat a belépéshez:',
    description: 'Label instructing the user to enter the pin',
  },
  enterTitle: {
    id: 'pin.enterTitle',
    defaultMessage: 'Add meg a PIN-kódodat:',
    description: 'Enter Pin modal title',
  },
  reEnter: {
    id: 'pin.reEnter',
    defaultMessage: 'PIN újbóli megadása:',
    description: 'Label instructing the user to re-enter the pin',
  },
  invalidPin: {
    id: 'pin.invalidPin',
    defaultMessage: 'A PIN-kódnak legalább 4 karakterből kell állnia.',
    description: 'Label instructing the user on the valid pin requirements',
  },
  invalidRePin: {
    id: 'pin.invalidRePin',
    defaultMessage: 'A PIN-ek nem egyeznek',
    description: 'Label instructing the user that the two pins don\'t match',
  },
};

export const actions = {
  resetRelays: {
    id: 'actions.resetRelays',
    defaultMessage: 'Relék visszaállítása',
    description: 'Reset relays label',
  },
  seeMore: {
    id: 'actions.seeMore',
    defaultMessage: 'Továbbiak megtekintése',
    description: 'See more label',
  },
  newNote: {
    id: 'actions.newNote',
    defaultMessage: 'Új bejegyzés',
    description: 'New note action label',
  },
  newArticle: {
    id: 'actions.newArticle',
    defaultMessage: 'Új cikk',
    description: 'New article action label',
  },
  createPin: {
    id: 'actions.createPin',
    defaultMessage: 'PIN beállítása',
    description: 'Create PIN action, button label',
  },
  optoutPin: {
    id: 'actions.optoutPin',
    defaultMessage: 'Folytatás PIN nélkül',
    description: 'opt-out of PIN action, button label',
  },
  createAccount: {
    id: 'actions.createAccount',
    defaultMessage: 'Fiók létrehozása',
    description: 'Create account action, button label',
  },
  login: {
    id: 'actions.login',
    defaultMessage: 'Bejelentkezés',
    description: 'Login action, button label',
  },
  loginNow: {
    id: 'actions.loginNow',
    defaultMessage: 'Jelentkezz most be',
    description: 'Login Now action, button label',
  },
  logout: {
    id: 'actions.logout',
    defaultMessage: 'Kijelentkezés',
    description: 'Logout action, button label',
  },
  getStarted: {
    id: 'actions.getStarted',
    defaultMessage: 'Kezdés',
    description: 'Get Started action, button label',
  },
  forgotPin: {
    id: 'actions.forgotPin',
    defaultMessage: 'Elfelejtettem a PIN-kódomat',
    description: 'Forgot PIN action, button label',
  },
  cancel: {
    id: 'actions.cancel',
    defaultMessage: 'Mégse',
    description: 'Cancel action, button label',
  },
  copy: {
    id: 'actions.copy',
    defaultMessage: 'Másolás',
    description: 'Copy action, button label',
  },
  copyPubkey: {
    id: 'actions.copyPubkey',
    defaultMessage: 'Nyilvános kulcs másolása',
    description: 'Copy pubkey action, button label',
  },
  copyPrivkey: {
    id: 'actions.copyPrivkey',
    defaultMessage: 'Privát kulcs másolása',
    description: 'Copy private key action, button label',
  },
  addFeedToHome: {
    id: 'actions.addFeedToHome',
    defaultMessage: 'Ezt a hírcsatornát hozzáadom a főoldalamhoz',
    description: 'Add feed to home, button label',
  },
  addFeedToHomeNamed: {
    id: 'actions.addFeedToHomeNamed',
    defaultMessage: '{name} hírcsatornájának hozzáadása a főoldalhoz',
    description: 'Add named feed to home, button label',
  },
  disabledAddFeedToHome: {
    id: 'actions.disabledHomeFeedAdd',
    defaultMessage: 'Elérhető a főoldaladon',
    description: 'Add feed to home label, when feed is already added',
  },
  removeFromHomeFeedNamed: {
    id: 'actions.removeFromHomeFeedNamed',
    defaultMessage: '{name} hírcsatornájának eltávolítása a főoldalról',
    description: 'Remove named feed from home, button label',
  },
  noteCopyNostrLink: {
    id: 'actions.noteCopyNostrLink',
    defaultMessage: 'Noszter link másolása',
    description: 'Label for the copy Nostr note link context menu item',
  },
  noteCopyPrimalLink: {
    id: 'actions.noteCopyPrimalLink',
    defaultMessage: 'Primal link másolása',
    description: 'Label for the copy Primal note link context menu item',
  },
  notePostNew: {
    id: 'actions.notePostNew',
    defaultMessage: 'Küldés',
    description: 'Send new note, button label',
  },
  noteReply: {
    id: 'actions.noteReply',
    defaultMessage: 'Válasz {name} felhasználónak',
    description: 'Reply to button label',
  },
  sendDirectMessage: {
    id: 'actions.sendDirectMessage',
    defaultMessage: 'Küldés',
    description: 'Send direct message action, button label',
  },
  save: {
    id: 'actions.save',
    defaultMessage: 'Mentés',
    description: 'Save changes action label',
  },
  previous: {
    id: 'actions.previous',
    defaultMessage: 'Előző',
    description: 'Go to previous step action label',
  },
  next: {
    id: 'actions.next',
    defaultMessage: 'Következő',
    description: 'Go to next step action label',
  },
  finish: {
    id: 'actions.finish',
    defaultMessage: 'Befejezés',
    description: 'Finish the wizard action label',
  },
  editProfile: {
    id: 'actions.editProfile',
    defaultMessage: 'Profil szerkesztése',
    description: 'Edit profile action label',
  },
  reportUserConfirm: {
    id: 'actions.reportUserConfirm',
    defaultMessage: '{name} jelentése?',
    description: 'Label for report user confirmation',
  },
  muteUserConfirm: {
    id: 'actions.muteUserConfirm',
    defaultMessage: 'Hozzáadod {name} felhasználót a némított listádhoz?',
    description: 'Label for mute user confirmation',
  },
  unmute: {
    id: 'actions.unmute',
    defaultMessage: 'Némítás feloldása',
    description: 'Label un-mute button',
  },
  addToAllowlist: {
    id: 'actions.addToAllowlist',
    defaultMessage: 'Hozzáadás az engedélyezési listához',
    description: 'Label add-to-allowlist button',
  },
  addRelay: {
    id: 'actions.addRelay',
    defaultMessage: 'Hozzáadás',
    description: 'Label for add relay action',
  },
  removeRelay: {
    id: 'actions.removeRelay',
    defaultMessage: 'Eltávolítás',
    description: 'Label for remove relay action',
  },
  confirmRemoveRelay: {
    id: 'actions.confirmRemoveRelay',
    defaultMessage: '<b>{url}</b> eltávolítása a relélistádról? Ez megszakítja a kapcsolatot a relével.',
    description: 'Label for remove relay confirmation',
  },
  restoreCachingService: {
    id: 'actions.restoreCachingService',
    defaultMessage: 'Alapértelmezett gyorsítótárazási szolgáltatás visszaállítása',
    description: 'Label for restore default caching service',
  },
  profileContext: {
    copyPubkey: {
      id: 'actions.profileContext.copyPubkey',
      defaultMessage: 'Felhasználó nyilvános kulcsának másolása',
      description: 'Label for copy user\'s pubkey from profile context menu',
    },
    copyLink: {
      id: 'actions.profileContext.copyLink',
      defaultMessage: 'Felhasználói link másolása',
      description: 'Label for copy user\'s link from profile context menu',
    },
    addFeed: {
      id: 'actions.profileContext.addFeed',
      defaultMessage: 'Felhasználó hírcsatornájának hozzáadása',
      description: 'Label for adding user\'s feed to home, from profile context menu',
    },
    removeFeed: {
      id: 'actions.profileContext.removeFeed',
      defaultMessage: 'Felhasználó hírcsatornájának eltávolítása',
      description: 'Label for removing user\'s feed from home, from profile context menu',
    },
    muteUser: {
      id: 'actions.profileContext.muteUser',
      defaultMessage: 'Felhasználó némítása',
      description: 'Label for muting user from profile context menu',
    },
    unmuteUser: {
      id: 'actions.profileContext.unmuteUser',
      defaultMessage: 'Felhasználó némításának feloldása',
      description: 'Label for unmuting user from profile context menu',
    },
    followMute: {
      id: 'actions.profileContext.followMute',
      defaultMessage: 'Felhasználó némítási listájának követése',
      description: 'Label for following user\'s mute list',
    },
    unfollowMute: {
      id: 'actions.profileContext.unfollowMute',
      defaultMessage: 'Nem követem tovább a felhasználó némítási listáját',
      description: 'Label for unfollowing user\'s mute list',
    },
    reportUser: {
      id: 'actions.profileContext.reportUser',
      defaultMessage: 'Felhasználó jelentése',
      description: 'Label for reporting user from profile context menu',
    },
  },
  noteContext: {
    reactions: {
      id: 'actions.noteContext.reactions',
      defaultMessage: 'Reakciók',
      description: 'Label for note reactions from context menu',
    },
    zap: {
      id: 'actions.noteContext.zapNote',
      defaultMessage: 'Egyedi Zap küldése',
      description: 'Label for note zap from context menu',
    },
    copyLink: {
      id: 'actions.noteContext.copyLink',
      defaultMessage: 'Bejegyzés link másolása',
      description: 'Label for copy note link from context menu',
    },
    copyText: {
      id: 'actions.noteContext.copytext',
      defaultMessage: 'Bejegyzés szöveg másolása',
      description: 'Label for copy note text from context menu',
    },
    copyId: {
      id: 'actions.noteContext.copyId',
      defaultMessage: 'Bejegyzés azonosító másolása',
      description: 'Label for copy note ID from context menu',
    },
    copyRaw: {
      id: 'actions.noteContext.copyRaw',
      defaultMessage: 'Nyers adat másolása',
      description: 'Label for copy note raw data from context menu',
    },
    copyPubkey: {
      id: 'actions.noteContext.copyPubkey',
      defaultMessage: 'Felhasználó nyilvános kulcsának másolása',
      description: 'Label for copy note author\'s pubkey from context menu',
    },
    breadcast: {
      id: 'actions.noteContext.breadcast',
      defaultMessage: 'Bejegyzés közzététele',
      description: 'Label for note broadcast from context menu',
    },
    muteAuthor: {
      id: 'actions.noteContext.muteAuthor',
      defaultMessage: 'Felhasználó némítása',
      description: 'Label for muting user from context menu',
    },
    unmuteAuthor: {
      id: 'actions.noteContext.unmuteAuthor',
      defaultMessage: 'Felhasználó némításának feloldása',
      description: 'Label for unmuting user from context menu',
    },
    reportAuthor: {
      id: 'actions.noteContext.reportAuthor',
      defaultMessage: 'Felhasználó jelentése',
      description: 'Label for reporting user from context menu',
    },
    repostNote: {
      id: 'actions.noteContext.repostNote',
      defaultMessage: 'Bejegyzés újra-posztolása',
      description: 'Label for reposting note from context menu',
    },
    quoteNote: {
      id: 'actions.noteContext.quoteNote',
      defaultMessage: 'Bejegyzés idézése',
      description: 'Label for quoting note from context menu',
    },
  },
  zap: {
    id: 'actions.zap',
    defaultMessage: 'Zap küldése',
    description: 'Label for zap',
  },
  reactions: {
    id: 'actions.reactions',
    defaultMessage: 'Reakciók ({count})',
    description: 'Label for reactions',
  },
};

export const branding = {
  id: 'branding',
  defaultMessage: 'Primal',
  description: 'Brand name',
};

export const downloads = {
  title: {
    id: 'downloads.title',
    defaultMessage: 'Letöltések',
    description: 'Title of the downloads page',
  },
  build: {
    id: 'downloads.build',
    defaultMessage: 'Verzió',
    description: 'Build label',
  },
  released: {
    id: 'downloads.released',
    defaultMessage: 'Megjelent',
    description: 'Released label',
  },
  getApk: {
    id: 'downloads.getApk',
    defaultMessage: 'APK letöltése',
    description: 'APK download label',
  },
  callToActionIOSTitle: {
    id: 'downloads.ctaIOSTitle',
    defaultMessage: 'Primal iOS',
    description: 'Title for the iOS downloads\' page call-to-action',
  },
  callToActionIOSDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'Az app gyors és egyszerű használatot biztosít, lehetőséget ad a Noszter felfedezésére, valamint egyéni hírcsatornák létrehozására és kezelésére.',
    description: 'Description for the iOS downloads\' page call-to-action',
  },
  callToActionAndroidTitle: {
    id: 'downloads.ctaAndroidTitle',
    defaultMessage: 'Primal Android',
    description: 'Title for the Android downloads\' page call-to-action',
  },
  callToActionAndroidDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'Az app gyors és egyszerű használatot biztosít, lehetőséget ad a Noszter felfedezésére, valamint egyéni hírcsatornák létrehozására és kezelésére.',
    description: 'Description for the Android downloads\' page call-to-action',
  },
  callToActionQRTitle: {
    id: 'downloads.ctaQRTitle',
    defaultMessage: 'Szkennelj be a telepítéshez!',
    description: 'Title for the QR code downloads\' page call-to-action',
  },
  appStoreCaption: {
    id: 'downloads.appStoreCaption',
    defaultMessage: 'TestFlight elérhető most',
    description: 'AppStore promo caption',
  },
  playStoreCaption: {
    id: 'downloads.playStoreCaption',
    defaultMessage: 'Hamarosan Androidra is',
    description: 'PlayStore promo caption',
  },
  apkDownload: {
    id: 'downloads.apkDownload',
    defaultMessage: 'Alfa verzió elérhető most',
    description: 'APK download caption',
  },
  links: {
    title: {
      id: 'downloads.sidebarTitle',
      defaultMessage: 'Forráskód',
      description: 'Daownload sidebar links title',
    },
    webApp: {
      id: 'downloads.webAppLink',
      defaultMessage: 'Primal Web App',
      description: 'Label for the link to the web app',
    },
    iosApp: {
      id: 'downloads.iosAppLink',
      defaultMessage: 'Primal iOS App',
      description: 'Label for the link to the iOS app',
    },
    andApp: {
      id: 'downloads.andAppLink',
      defaultMessage: 'Primal Android App',
      description: 'Label for the link to the Android app',
    },
    cachingService: {
      id: 'downloads.cachingService',
      defaultMessage: 'Primal gyorsítótárazási szolgáltatás',
      description: 'Label for the link to the caching service',
    },
    primalServer: {
      id: 'downloads.primalServer',
      defaultMessage: 'Primal szerver',
      description: 'Label for the link to the primal server',
    },
  },
};

export const confirmDefaults = {
  title: {
    id: 'confirm.title',
    defaultMessage: 'Biztos vagy benne?',
    description: 'Default title of the confirmation dialog',
  },
  confirm: {
    id: 'confirm.yes',
    defaultMessage: 'Igen',
    description: 'Default label for positive response to the confirmation dialog',
  },
  abort: {
    id: 'confirm.no',
    defaultMessage: 'Nem',
    description: 'Default label for negative response to the confirmation dialog',
  },
  cancel: {
    id: 'confirm.cancel',
    defaultMessage: 'Mégse',
    description: 'Default label for cancel response to the confirmation dialog',
  },
};

export const exploreSidebarCaption = {
  id: 'explore.sidebar.caption',
  defaultMessage: 'Népszerű felhasználók',
  description: 'Caption for the explore page sidebar showing a list of trending users',
};

export const explore = {
  genericCaption: {
    id: 'explore.genericCaption',
    defaultMessage: 'Felfedezés',
    description: 'Generic caption for the explore page',
  },
  pageTitle: {
    id: 'explore.pageTitle',
    defaultMessage: 'Felfedezés',
    description: 'Title of the explore page',
  },
  title: {
    id: 'explore.title',
    defaultMessage: '{timeframe}: {scope}',
    description: 'Title of the explore page',
  },
  statDisplay: {
    users: {
      id: 'explore.stats.users',
      defaultMessage:'Felhasználó',
      description: 'Label for number of users stats',
    },
    pubkeys: {
      id: 'explore.stats.pubkeys',
      defaultMessage: 'Nyilvános kulcs',
      description: 'Label for number of pubkeys stats',
    },
    zaps: {
      id: 'explore.stats.zaps',
      defaultMessage: 'Zap',
      description: 'Label for number of zaps stats',
    },
    btcZapped: {
      id: 'explore.stats.btcZapped',
      defaultMessage: 'BTC Zappolva',
      description: 'Label for number of zapped bitcoins stats',
    },
    pubnotes: {
      id: 'explore.stats.pubnotes',
      defaultMessage: 'Nyilvános bejegyzés',
      description: 'Label for number of public notes stats',
    },
    reposts: {
      id: 'explore.stats.reposts',
      defaultMessage: 'Újramegosztás',
      description: 'Label for number of repost stats',
    },
    reactions: {
      id: 'explore.stats.reactions',
      defaultMessage: 'Reakció',
      description: 'Label for number of reactions stats',
    },
    any: {
      id: 'explore.stats.any',
      defaultMessage: 'Minden esemény',
      description: 'Label for number of all stats',
    },
  }
};

export const feedProfile = {
  id: 'feedProfile',
  defaultMessage: '{name} hírfolyama',
  description: 'Generic name for a feed created from a profile',
};

export const feedProfileDesription = {
  id: 'feedProfileDesription',
  defaultMessage: '{name} bejegyzésfolyama',
  description: 'Generic description for a feed created from a profile',
};

export const feedNewPosts = {
  id: 'feed.newPosts',
  defaultMessage: `{number, plural,
    =0 {}
    one {# Új bejegyzés}
    =99 {99+ Új bejegyzés}
    other {# Új bejegyzés}}`,
  description: 'Label for a button to load new notes',
};

export const feedback = {
  dropzone: {
    id: 'feedback.dropzone',
    defaultMessage: 'Húzd ide a fájlt a feltöltéshez',
    description: 'Label accompanying the draging file'
  },
  uploading: {
    id: 'feedback.uploading',
    defaultMessage: 'Feltöltés folyamatban...',
    description: 'Label accompanying the uploading spinner'
  },
};

export const home = {
  trending: {
    id: 'home.sidebar.caption.trending',
    defaultMessage: 'Felkapott',
    description: 'Caption for the home page sidebar showing a list of trending notes',
  },
  mostZapped: {
    id: 'home.sidebar.caption.mostzapped',
    defaultMessage: 'Legtöbbet Zappolt',
    description: 'Caption for the home page sidebar showing a list of most zapped notes',
  },
  zapPostfix: {
    id: 'home.sidebar.note.zaps',
    defaultMessage: '{zaps} zap, {sats} sat',
    description: 'Zaps data for a small note on home sidebar',
  },
};

export const messages = {
  title: {
    id: 'messages.title',
    defaultMessage: 'Üzenetek',
    description: 'Title of messages page',
  },
  follows: {
    id: 'messages.follows',
    defaultMessage: 'követések',
    description: 'DM relation selection label for follows',
  },
  other: {
    id: 'messages.other',
    defaultMessage: 'egyéb',
    description: 'DM relation selection label for other',
  },
  markAsRead: {
    id: 'messages.markAsRead',
    defaultMessage: 'Mindet olvasottnak jelölöm',
    description: 'DM mark as read label',
  },
};

export const navBar = {
  home: {
    id: 'navbar.home',
    defaultMessage: 'Kezdőlap',
    description: 'Label for the nav bar item link to Home page',
  },
  reads: {
    id: 'navbar.reads',
    defaultMessage: 'Olvasnivalók',
    description: 'Label for the nav bar item link to Reads page',
  },
  explore: {
    id: 'navbar.explore',
    defaultMessage: 'Felfedezés',
    description: 'Label for the nav bar item link to Explore page',
  },
  messages: {
    id: 'navbar.messages',
    defaultMessage: 'Üzenetek',
    description: 'Label for the nav bar item link to Messages page',
  },
  bookmarks: {
    id: 'navbar.bookmarks',
    defaultMessage: 'Könyvjelzők',
    description: 'Label for the nav bar item link to Bookmarks page',
  },
  notifications: {
    id: 'navbar.notifications',
    defaultMessage: 'Értesítések',
    description: 'Label for the nav bar item link to Notifications page',
  },
  downloads: {
    id: 'navbar.downloads',
    defaultMessage: 'Letöltések',
    description: 'Label for the nav bar item link to Downloads page',
  },
  premium: {
    id: 'navbar.premium',
    defaultMessage: 'Prémium',
    description: 'Label for the nav bar item link to Premium page',
  },
  settings: {
    id: 'navbar.settings',
    defaultMessage: 'Beállítások',
    description: 'Label for the nav bar item link to Settings page',
  },
  help: {
    id: 'navbar.help',
    defaultMessage: 'Súgó',
    description: 'Label for the nav bar item link to Help page',
  },
};

export const note = {
  newPreview: {
    id: 'note.newPreview',
    defaultMessage: 'Bejegyzés előnézete',
    description: 'Caption for preview when creating a new note'
  },
  mentionIndication: {
    id: 'note.mentionIndication',
    defaultMessage: '\[{name} bejegyzései\]',
    description: 'Label indicating that a note has been metioned in the small note display'
  },
  reposted: {
    id: 'note.reposted',
    defaultMessage: 'Újramegosztotta',
    description: 'Label indicating that the note is a repost',
  },
  repostedOthers: {
    id: 'note.repostedOthers',
    defaultMessage: `{number, plural,
      =0 {}
      one { és még # ember}
      other { és még # ember}}`,
    description: 'Label indicating that the note is reposted more than once',
  },
  reply: {
    id: 'note.reply',
    defaultMessage: 'válaszol neki:',
    description: 'Label indicating that the note is a reply',
  },
  saveNoteDraft: {
    title: {
      id: 'note.saveNoteDraft.title',
      defaultMessage: 'Elmented a bejegyzés piszkozatát?',
      description: 'Title of the confirmation when the note is canceled',
    },
    description: {
      id: 'note.saveNoteDraft.description',
      defaultMessage: 'Szeretnéd elmenteni ezt a bejegyzéset, hogy később folytathasd a szerkesztést?',
      description: 'Description of the confirmation when the note is canceled',
    },
    optionYes: {
      id: 'note.saveNoteDraft.yes',
      defaultMessage: 'Mentés',
      description: 'Confirm saving not as draft',
    },
    optionNo: {
      id: 'note.saveNoteDraft.no',
      defaultMessage: 'Elvetés',
      description: 'Decline saving not as draft',
    },
    optionCancel: {
      id: 'note.saveNoteDraft.cancel',
      defaultMessage: 'Szerkesztés folytatása',
      description: 'Continue editing the note',
    },
  },
};

export const notificationTypeTranslations: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'követni kezdett',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'nem követ többé',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'zappolta a bejegyzésed',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'lájkolta a bejegyzésed',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'megosztotta a bejegyzésed',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'válaszolt a bejegyzésedre',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'megemlített egy bejegyzésben',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'megemlítette a bejegyzésed',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'zappolt egy bejegyzést, amiben megemlítettek',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'lájkolt egy bejegyzést, amiben megemlítettek',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'megosztott egy bejegyzést, amiben megemlítettek',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'válaszolt egy bejegyzésre, amiben megemlítettek',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'zappolt egy bejegyzést, amiben megemlítették a bejegyzésed',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'lájkolt egy bejegyzést, amiben megemlítették a bejegyzésed',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'megosztott egy bejegyzést, amiben megemlítették a bejegyzésed',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'válaszolt egy bejegyzésre, amiben megemlítették a bejegyzésed',
}

export const notificationsNew: Record<number, MessageDescriptor> = Object.values(NotificationType).reduce((acc, type) => ({
  ...acc,
  [type]: {
    id: `notifications.new.${type}`,
    defaultMessage: `{number, plural,
      =0 {}
      one {és még # ember}
      other {és még # ember}}
      ${notificationTypeTranslations[type]}`,
    description: `New Notifiaction label for notifications of type ${type}`,
  },
}), {});

export const notificationsOld: Record<number, MessageDescriptor> = Object.values(NotificationType).reduce((acc, type) => ({
  ...acc,
  [type]: {
    id: `notifications.old.${type}`,
    defaultMessage: `${notificationTypeTranslations[type]}`,
    description: `Old Notifiaction label for notifications of type ${type}`,
  },
}), {});

export const notificationsSidebar = {
  activities: {
    id: 'notifications.sidebar.activities',
    defaultMessage: 'Reakciók',
    description: 'Sidebar activities stats caption on the notification page',
  },
  heading: {
    id: 'notificationsSidebar.heading',
    defaultMessage: 'Összegzés',
    description: 'Sidebar caption on the notification page',
  },
  empty: {
    id: 'notificationsSidebar.empty',
    defaultMessage: 'Nincs új értesítés',
    description: 'Sidebar caption indicating no new notifications',
  },
  followers: {
    id: 'notificationsSidebar.followers',
    defaultMessage: 'Követők',
    description: 'Sidebar follower stats caption on the notification page',
  },
  gainedFollowers: {
    id: 'notificationsSidebar.gainedFollowers',
    defaultMessage: `új {number, plural,
      =0 {}
      one {követő}
      other {követő}}`,
    description: 'Sidebar new follower stats description on the notification page',
  },
  lostFollowers: {
    id: 'notificationsSidebar.lostFollowers',
    defaultMessage: `vesztett {number, plural,
      =0 {}
      one {követő}
      other {követő}}`,
    description: 'Sidebar lost follwers stats description on the notification page',
  },
  likes: {
    id: 'notifications.sidebar.likes',
    defaultMessage: `{number, plural,
      =0 {}
      one {lájk}
      other {lájk}}`,
    description: 'Sidebar likes stats caption on the notification page',
  },
  mentions: {
    id: 'notifications.sidebar.mentions',
    defaultMessage: 'Említések',
    description: 'Sidebar mentions stats caption on the notification page',
  },
  mentionsYou: {
    id: 'notifications.sidebar.mentionsYou',
    defaultMessage: `{number, plural,
      =0 {}
      one {említés}
      other {említés}} of you`,
    description: 'Sidebar mentions you stats description on the notification page',
  },
  mentionsYourPost: {
    id: 'notifications.sidebar.mentionsYourPost',
    defaultMessage: `{number, plural,
      =0 {}
      one {bejegyzésed említése}
      other {bejegyzésed említése}}`,
    description: 'Sidebar mentions your note stats description on the notification page',
  },
  replies: {
    id: 'notifications.sidebar.replies',
    defaultMessage: `{number, plural,
      =0 {}
      one {válasz}
      other {válasz}}`,
    description: 'Sidebar replies stats caption on the notification page',
  },
  reposts: {
    id: 'notifications.sidebar.reposts',
    defaultMessage: `{number, plural,
      =0 {}
      one {újramegosztás}
      other {újramegosztás}}`,
    description: 'Sidebar reposts stats caption on the notification page',
  },
  other: {
    id: 'notifications.sidebar.other',
    defaultMessage: 'egyéb',
    description: 'Sidebar other stats caption on the notification page',
  },
  zaps: {
    id: 'notificationsSidebar.zaps',
    defaultMessage: 'Zappok',
    description: 'Sidebar zaps stats caption on the notification page',
  },
  zapNumber: {
    id: 'notificationsSidebar.zapNumber',
    defaultMessage: `{number, plural,
      =0 {}
      one {zapp}
      other {zapp}}`,
    description: 'Sidebar zaps stats description on the notification page',
  },
  statsNumber: {
    id: 'notificationsSidebar.statsNumber',
    defaultMessage: `{number, plural,
      =0 {}
      one {sat}
      other {sat}}`,
    description: 'Sidebar sats stats description on the notification page',
  },
};

export const notifications = {
  title: {
    id: 'pages.notifications.title',
    defaultMessage: 'Értesítések',
    description: 'Title of the notifications page',
  },
  newNotifs: {
    id: 'notification.newNotifs',
    defaultMessage: `{number, plural,
      =0 {}
      one {# új értesítés}
      =100 {99+ új értesítés}
      other {# új értesítés}}`,
    description: 'Label for a button to load new notifications',
  },
  all: {
    id: 'pages.notifications.all',
    defaultMessage: 'Összes',
    description: 'Title of the All notifications tab',
  },
  zaps: {
    id: 'pages.notifications.zaps',
    defaultMessage: 'Zappok',
    description: 'Title of the Zaps notifications tab',
  },
  replies: {
    id: 'pages.notifications.replies',
    defaultMessage: 'Válaszok',
    description: 'Title of the Replies notifications tab',
  },
  mentions: {
    id: 'pages.notifications.mentions',
    defaultMessage: 'Említések',
    description: 'Title of the Mentions notifications tab',
  },
  reposts: {
    id: 'pages.notifications.reposts',
    defaultMessage: 'Újramegosztások',
    description: 'Title of the Reposts notifications tab',
  },
};

export const placeholders = {
  missingNote: {
    firstLine: {
      id: 'placeholders.missingNote.firstLine',
      defaultMessage: 'Úgy tűnik, hogy nem találjuk e bejegyzést.',
      description: 'Placeholder when the note is missing',
    },
    secondLine: {
      id: 'placeholders.missingNote.secondLine',
      defaultMessage: 'Lehet, hogy a szerző törölte.',
      description: 'Placeholder when the note is missing',
    },
  },
  noReactionDetails: {
    id: 'placeholders.noReactionDetails',
    defaultMessage: 'Nincsenek részletek a reakciókról',
    description: 'Placeholder when there are no reaction details in reactions modal',
  },
  noLikeDetails: {
    id: 'placeholders.noLikeDetails',
    defaultMessage: 'Nincsenek részletek a kedvelésekről',
    description: 'Placeholder when there are no like details in reactions modal',
  },
  noZapDetails: {
    id: 'placeholders.noZapDetails',
    defaultMessage: 'Nincsenek részletek a zapekről',
    description: 'Placeholder when there are no zap details in reactions modal',
  },
  noRepostDetails: {
    id: 'placeholders.noRepostDetails',
    defaultMessage: 'Nincsenek részletek az újramegosztásokról',
    description: 'Placeholder when there are no repost details in reactions modal',
  },
  noQuoteDetails: {
    id: 'placeholders.noQuoteDetails',
    defaultMessage: 'Nincsenek részletek az idézetekről',
    description: 'Placeholder when there are no quote details in reactions modal',
  },
  addComment: {
    id: 'placeholders.addComment',
    defaultMessage: 'Hozzászólás hozzáadása...',
    description: 'Placeholder for adding a comment',
  },
  searchByNpub: {
    id: 'placeholders.searchByNpub',
    defaultMessage: 'keresés npub alapján...',
    description: 'Placeholder for searching by npub',
  },
  addNpub: {
    id: 'placeholders.addNpub',
    defaultMessage: 'npub hozzáadása...',
    description: 'Placeholder for adding npub',
  },
  mustHaveOneCachingService: {
    id: 'placeholders.mustHaveOneCachingService',
    defaultMessage: 'Jelenleg az ügyfélnek legalább egy gyorsítótárazási szolgáltatásra van szüksége a működéshez. A jövőben hozzáadjuk a lehetőséget, hogy a Primal gyorsítótárazás nélkül is működjön, de ez egyelőre nem támogatott.',
    description: 'Description when trying to remove the last caching service from the pool',
  },
  cachingPoolHelp: {
    id: 'placeholders.cachingPoolHelp',
    defaultMessage: 'Az ügyfél véletlenszerűen csatlakozik a gyorsítótárazási szolgáltatások egyikéhez ebben a poolban. Ez segít a rendszer megbízhatóságának fenntartásában, ha egyes szolgáltatások leállnak. Hozzáadhatsz vagy eltávolíthatsz szolgáltatásokat. Ha mindig pontosan egy gyorsítótárazási szolgáltatáshoz szeretnél csatlakozni, akkor hagyj csak egy bejegyzést ebben a poolban.',
    description: 'text for caching pool help bubble',
  },
  resetRelaysHelp: {
    id: 'placeholders.resetRelaysHelp',
    defaultMessage: 'Ez a művelet leválaszt minden jelenlegi relayről, és egy ajánlott relay-készlethez csatlakoztat.',
    description: 'text for caching pool help bubble',
  },
  comingSoon: {
    id: 'placeholders.comingSoon',
    defaultMessage: 'Hamarosan érkezik. Komolyan. Segítség úton van. ;)',
    description: 'Placholder text for missing content',
  },
  endOfFeed: {
    id: 'placeholders.endOfFeed',
    defaultMessage: 'Elérted a végét. Gyors olvasó vagy!',
    description: 'Message displayed when user reaches the end of the feed',
  },
  guestUserGreeting: {
    id: 'placeholders.guestUserGreeting',
    defaultMessage: 'Üdv a Noszteren!',
    description: 'Header placeholder for guest user',
  },
  noteCallToAction: {
    id: 'placeholders.callToAction.note',
    defaultMessage: 'Mondj valamit a Noszteren...',
    description: 'Placeholder for new note call-to-action',
  },
  pageWIPTitle: {
    id: 'pages.wip.title',
    defaultMessage: '{title}',
    description: 'Title of page under construction',
  },
  welcomeMessage: {
    id: 'placeholders.welcomeMessage',
    defaultMessage: 'Üdv a Noszteren!',
    description: 'Default welcome message',
  },
  findUser: {
    id: 'placeholders.findUser',
    defaultMessage: 'felhasználó keresése',
    description: 'Find user input placeholder',
  },
  findUsers: {
    id: 'placeholders.findUsers',
    defaultMessage: 'felhasználók keresése',
    description: 'Find users input placeholder',
  },
  search: {
    id: 'placeholders.search',
    defaultMessage: 'Keresés...',
    description: 'Search input placeholder',
  },
  selectFeed: {
    id: 'placeholders.selectFeed',
    defaultMessage: 'Feed kiválasztása',
    description: 'Placeholder for feed selection',
  },
  pageNotFound: {
    id: 'placeholders.pageNotFound',
    defaultMessage: 'Az oldal nem található',
    description: 'Placholder text for missing page',
  },
  relayUrl: {
    id: 'placeholders.relayUrl',
    defaultMessage: 'wss://relay.url',
    description: 'Placholder relay url input',
  },
  cachingServiceUrl: {
    id: 'placeholders.cachingServiceUrl',
    defaultMessage: 'wss://cachingservice.url',
    description: 'Placholder relay url input',
  },
};

export const profile = {
  sidebarCaptionReads: {
    id: 'profile.sidebar.captionReads',
    defaultMessage: 'Legutóbbi cikkek',
    description: 'Caption for the profile page sidebar showing a list of latest reads by the profile',
  },
  sidebarCaptionNotes: {
    id: 'profile.sidebar.captionNotes',
    defaultMessage: 'Népszerű bejegyzések',
    description: 'Caption for the profile page sidebar showing a list of trending notes by the profile',
  },
  sidebarNoNotes: {
    id: 'profile.sidebar.noNotes',
    defaultMessage: 'Nincsenek trendi bejegyzések',
    description: 'Placeholde for profile sidebar when the profile is missing trending notes',
  },
  title: {
    id: 'profile.title',
    defaultMessage: '{name} - Noszter profil',
    description: 'Page title for Profile page'
  },
  followsYou: {
    id: 'profile.followsYou',
    defaultMessage: 'Követ téged',
    description: 'Label indicating that a profile is following your profile',
  },
  jointDate: {
    id: 'profile.joinDate',
    defaultMessage: 'Csatlakozott a Noszterhez: {date}',
    description: 'Label indicating when the profile joined Nostr (oldest event)',
  },
  stats: {
    gallery: {
      id: 'profile.gallery',
      defaultMessage: 'Média',
      description: 'Label for gallery profile stat',
    },
    follow: {
      id: 'profile.followStats',
      defaultMessage: 'Követések',
      description: 'Label for following profile stat',
    },
    followers: {
      id: 'profile.stats.followers',
      defaultMessage: 'Követők',
      description: 'Label for followers profile stat',
    },
    zaps: {
      id: 'profile.stats.zaps',
      defaultMessage: 'Zap',
      description: 'Label for zaps profile stat',
    },
    sats: {
      id: 'profile.stats.sats',
      defaultMessage: 'Sat',
      description: 'Label for sats profile stat',
    },
    totalSats: {
      id: 'profile.stats.totalSats',
      defaultMessage: 'Összesen',
      description: 'Label for total sats profile stat',
    },
    articles: {
      id: 'profile.stats.articles',
      defaultMessage: 'Olvasnivaló',
      description: 'Label for reads profile stat',
    },
    notes: {
      id: 'profile.stats.notes',
      defaultMessage: 'Bejegyzés',
      description: 'Label for notes profile stat',
    },
    replies: {
      id: 'profile.stats.replies',
      defaultMessage: 'Válasz',
      description: 'Label for replies profile stat',
    },
    relays: {
      id: 'profile.stats.relays',
      defaultMessage: 'Relé',
      description: 'Label for sats profile relays',
    },
  },
  isMuted: {
    id: 'profile.isMuted',
    defaultMessage: '{name} le van némítva',
    description: 'Label indicating that the profile is muted',
  },
  isFiltered: {
    id: 'profile.isFiltered',
    defaultMessage: 'Ez a fiók rejtve van a szűrőbeállításaid alapján.',
    description: 'Label indicating that the profile is filtered',
  },
  noNotes: {
    id: 'profile.noNotes',
    defaultMessage: '{name} nem posztolt még bejegyzést',
    description: 'Label indicating that the profile has no notes',
  },
  noArticles: {
    id: 'profile.noArticles',
    defaultMessage: '{name} nem posztolt még olvasnivalót',
    description: 'Label indicating that the profile has no reads',
  },
  noReplies: {
    id: 'profile.noReplies',
    defaultMessage: '{name} nem posztolt még válaszokat',
    description: 'Label indicating that the profile has no replies',
  },
  noFollowers: {
    id: 'profile.noFollowers',
    defaultMessage: '{name} nevű felhasználónak nincsenek követői',
    description: 'Label indicating that the profile has no followers',
  },
  noFollows: {
    id: 'profile.noFollows',
    defaultMessage: 'Senki sem követi {name} felhasználót',
    description: 'Label indicating that the profile has no followers',
  },
  noZaps: {
    id: 'profile.noZaps',
    defaultMessage: '{name} senkit sem zappelt',
    description: 'Label indicating that the profile has no zaps',
  },
  noRelays: {
    id: 'profile.noRelays',
    defaultMessage: '{name} nincs egy relayen sem',
    description: 'Label indicating that the profile has no relays',
  },
  qrModal: {
    pubkey: {
      id: 'profile.qrModal.pubkey',
      defaultMessage: 'Nyilvános kulcs',
      description: 'Public key tab title in profile qr code modal',
    },
    ln: {
      id: 'profile.qrModal.ln',
      defaultMessage: 'Lightning cím',
      description: 'Lightning address tab title in profile qr code modal',
    },

  }
};

export const search = {
  followers: {
    id: 'search.followers',
    defaultMessage: 'Követők',
    description: 'Followers label for user search results',
  },
  invalid: {
    id: 'search.invalid',
    defaultMessage: 'Kérlek, adj meg egy keresési kifejezést.',
    description: 'Alert letting the user know that the search term is empty',
  },
  emptyQueryResult: {
    id: 'search.emptyQueryResult',
    defaultMessage: 'írj be valamit...',
    description: 'Label shown is search resuls when no term is provided',
  },
  searchNostr: {
    id: 'search.searchNostr',
    defaultMessage: 'Noszter keresés',
    description: 'Label explaining full search action',
  },
  sidebarCaption: {
    id: 'search.sidebarCaption',
    defaultMessage: 'Talált felhasználók',
    description: 'Caption for the search page sidebar showing a list of users',
  },
  feedLabel: {
    id: 'search.feedLabel',
    defaultMessage: 'Keresés: {query}',
    description: 'Label for a search results feed',
  },
  title: {
    id: 'search.title',
    defaultMessage: 'Keresés erre: "{query}"',
    description: 'Title of the Search page',
  },
  noResults: {
    id: 'search.noResults',
    defaultMessage: 'Nincs találat',
    description: 'Message shown when no search results were found'
  },
};

export const settings = {
  index: {
    title: {
      id: 'settings.index.title',
      defaultMessage: 'Beállítások',
      description: 'Title of the settings page',
    },
  },
  account: {
    title: {
      id: 'settings.account.title',
      defaultMessage: 'Fiók',
      description: 'Title of the account settings sub-page',
    },
    description: {
      id: 'settings.account.description',
      defaultMessage: 'Növelheted a fiókod biztonságát egy Noszter böngészőbővítmény, például {link} telepítésével. Ha a Noszter privát kulcsodat egy böngészőbővítményben tárolod, biztonságosan be tudsz jelentkezni bármely Noszter webalkalmazásba, beleértve a Primalt is.',
      description: 'Warning about account security',
    },
    pubkey: {
      id: 'settings.account.pubkey',
      defaultMessage: 'Nyilvános kulcsod',
      description: 'Your public key section caption',
    },
    pubkeyDesc: {
      id: 'settings.account.pubkeyDesc',
      defaultMessage: 'Bárki megtalálhat a Noszteren a nyilvános kulcsodon keresztül. Nyugodtan oszd meg bárhol.',
      description: 'Label describing the public key',
    },
    privkey: {
      id: 'settings.account.privkey',
      defaultMessage: 'Privát kulcsod',
      description: 'Your private key section caption',
    },
    privkeyDesc: {
      id: 'settings.account.privkeyDesc',
      defaultMessage: 'Ez a kulcs teljes ellenőrzést biztosít a Noszter fiókod felett. Ne oszd meg senkivel. Csak akkor másold, ha biztonságosan tárolod, vagy ha egy másik Noszter alkalmazásba szeretnél bejelentkezni.',
      description: 'Label describing the private key',
    },
  },
  appearance: {
    title: {
      id: 'settings.appearance.title',
      defaultMessage: 'Megjelenés',
      description: 'Title of the appearance settings sub-page',
    },
    caption: {
      id: 'settings.appearance.caption',
      defaultMessage: 'Téma kiválasztása',
      description: 'Caption for theme selection',
    },
  },
  homeFeeds: {
    title: {
      id: 'settings.homeFeeds.title',
      defaultMessage: 'Kezdőlap hírfolyam',
      description: 'Title of the home feeds settings sub-page',
    },
    caption: {
      id: 'settings.homeFeeds.caption',
      defaultMessage: 'Szerkeszd és rendezd a kezdőlapod hírfolyamaid',
      description: 'Caption for home feed ordering',
    },
  },
  readsFeeds: {
    title: {
      id: 'settings.readsFeeds.title',
      defaultMessage: 'Olvasási hírfolyamok',
      description: 'Title of the reads feeds settings sub-page',
    },
    caption: {
      id: 'settings.readsFeeds.caption',
      defaultMessage: 'Szerkeszd és rendezd az olvasási oldalad hírfolyamaid',
      description: 'Caption for reads feed ordering',
    },
  },
  moderation: {
    title: {
      id: 'settings.filters.title',
      defaultMessage: 'Tartalomszűrés',
      description: 'Title of the content filtering settings sub-page',
    },
    description: {
      id: 'settings.filters.description',
      defaultMessage: 'A Primal testreszabható tartalomszűrési szolgáltatásokat kínál. A saját némítási listád mellett más felhasználók némítási listáira is feliratkozhatsz. A Primal valós idejű spamészlelési rendszert és NSFW (nem biztonságos munkahelyi) tartalomszűrést is működtet, amelyekre szintén feliratkozhatsz.',
      description: 'Description of the content filtering settings sub-page',
    },
    shortDescription: {
      id: 'settings.filters.shortDescription',
      defaultMessage: 'Feliratkozás egy felhasználó némítási listájára:',
      description: 'Short Description of the content filtering settings sub-page',
    },
    applyFiltering: {
      id: 'settings.filters.applyFiltering',
      defaultMessage: 'Tartalomszűrés alkalmazása',
      description: 'Caption for home feed ordering',
    },
    searchFilteredAccount: {
      id: 'settings.filters.searchFilteredAccount',
      defaultMessage: 'Szűrt fiókok keresése',
      description: 'Caption for home feed ordering',
    },
    allowList: {
      id: 'settings.filters.allowList',
      defaultMessage: 'Engedélyezési listám',
      description: 'Caption for home feed ordering',
    },
    moderationItem: {
      id: 'settings.contentModeration.item',
      defaultMessage: '{name} némítási listája',
      description: 'Caption for my mute list algo',
    },
    searchForFiltered: {
      id: 'settings.contentModeration.searchForFiltered',
      defaultMessage: 'Keresd meg, hogy egy felhasználói fiók szerepel-e bármelyik szűrőlistán:',
      description: 'Description for search for filtered users',
    },
    allowListsDescription: {
      id: 'settings.contentModeration.allowListsDescription',
      defaultMessage: 'Adj hozzá felhasználói fiókokat, amelyeket ki kell zárni a szűrésből:',
      description: 'Description for allow lists',
    },
    table: {
      mutelists: {
        id: 'settings.contentModeration.table.mutelists',
        defaultMessage: 'Némítási listák',
        description: 'Caption for mutelists column on moderation settings page',
      },
      algos: {
        id: 'settings.contentModeration.table.algos',
        defaultMessage: 'Algoritmusok',
        description: 'Caption for algorithms column on moderation settings page',
      },
      content: {
        id: 'settings.contentModeration.table.content',
        defaultMessage: 'Tartalom elrejtése',
        description: 'Caption for content column on moderation settings page',
      },
      trending: {
        id: 'settings.contentModeration.table.trending',
        defaultMessage: 'Ne javasold',
        description: 'Caption for trending column on moderation settings page',
      },
      trendingHelp: {
        id: 'settings.contentModeration.table.trendingHelp',
        defaultMessage: 'A tartalom nem lesz ajánlott a népszerű és a legtöbbet zappolt hírfolyamokban.',
        description: 'Help description for trending filter',
      },
      contentHelp: {
        id: 'settings.contentModeration.table.contentHelp',
        defaultMessage: 'A tartalom el lesz rejtve minden feedből, szálból és keresési eredményből',
        description: 'Help description for content filter',
      },
    },
    algos: {
      my: {
        id: 'settings.contentModeration.algos.my',
        defaultMessage: 'Saját némítási lista',
        description: 'Caption for my mute list algo',
      },
      primal_spam: {
        id: 'settings.contentModeration.algos.spam',
        defaultMessage: 'Primal spam szűrő',
        description: 'Caption for spam algo',
      },
      primal_nsfw: {
        id: 'settings.contentModeration.algos.nsfw',
        defaultMessage: 'Primal NSFW szűrő',
        description: 'Caption for NSFW algo',
      },
    },
  },
  muted: {
    title: {
      id: 'settings.muted.title',
      defaultMessage: 'Némított fiókok',
      description: 'Title of the muted accounts settings sub-page',
    },
    empty: {
      id: 'settings.muted.empty',
      defaultMessage: 'Nincsenek némított felhasználók',
      description: 'Caption indicating that there are no muted users',
    },
    emptyOther: {
      id: 'settings.muted.emptyOther',
      defaultMessage: 'Ez a felhasználó nem némított le senkit és nem használt nem-hagyománys némítási listát sem.',
      description: 'Caption indicating that there are no muted users on someone else\'s list',
    },
  },
  network: {
    title: {
      id: 'settings.network.title',
      defaultMessage: 'Hálózat',
      description: 'Title of the network settings sub-page',
    },
    relays: {
      id: 'settings.network.relays',
      defaultMessage: 'Relék',
      description: 'Title of the relays section of the network settings sub-page',
    },
    myRelays: {
      id: 'settings.network.myRelays',
      defaultMessage: 'Saját relék',
      description: 'Title of the my relays section of the network settings sub-page',
    },
    noMyRelays: {
      id: 'settings.networks.noMyRelays',
      defaultMessage: 'A Noszter fiókodban nincs relé megadva, ezért egy alapértelmezett relé-készlethez csatlakoztatunk. A kívánt relék beállításához válaszd ki őket az alábbi listából.',
      description: 'Caption informing the user that he has no relays configured',
    },
    recomended: {
      id: 'settings.network.recomended',
      defaultMessage: 'Ajánlott relék',
      description: 'Title of the recomended relays section of the network settings sub-page',
    },
    customRelay: {
      id: 'settings.network.customRelay',
      defaultMessage: 'Csatlakozás a reléhez',
      description: 'Title of the custom relays section of the network settings sub-page',
    },
    cachingService: {
      id: 'settings.network.cachingService',
      defaultMessage: 'Gyorsítótárazási szolgáltatás',
      description: 'Title of the caching service section of the network settings sub-page',
    },
    connectedCachingService: {
      id: 'settings.network.connectedCachingService',
      defaultMessage: 'Csatlakoztatott gyorsítótár-szolgáltatás',
      description: 'Title of the caching service section of the network settings sub-page',
    },
    alternativeCachingService: {
      id: 'settings.network.alternativeCachingService',
      defaultMessage: 'Csatlakozás egy másik gyorsítótár-szolgáltatáshoz',
      description: 'Title of the alternative caching service section of the Network settings sub-page',
    },
    proxyEvents: {
      id: 'settings.filters.proxyEvents',
      defaultMessage: 'Használj fokozott adatvédelmet',
      description: 'Caption for option to proy event publishing through Primal',
    },
    proxyDescription: {
      id: 'settings.filters.proxyDescription',
      defaultMessage: 'Ha engedélyezed, az IP-címed látható lesz a gyorsítótár-szolgáltatás számára, de nem a reléknek. A tartalmad a megadott relékre a gyorsítótár-szolgáltatás proxyként való használatával kerül publikálásra.',
      description: 'Description of the proxy events settings sub-page',
    },
  },
  relays: {
    id: 'settings.relays',
    defaultMessage: 'Relék',
    description: 'Title of the relays sections of the settings sidebar',
  },
  cashingService: {
    id: 'settings.cashingService',
    defaultMessage: 'Gyorsítótár-szolgáltatások',
    description: 'Title of the caching service sections of the settings sidebar',
  },
  title: {
    id: 'settings.title',
    defaultMessage: 'Beállítások',
    description: 'Title of the settings page',
  },
  theme: {
    id: 'settings.sections.theme',
    defaultMessage: 'Téma',
    description: 'Title of the theme section on the settings page',
  },
  feeds: {
    id: 'settings.sections.feeds',
    defaultMessage: 'Kezdőoldali hírfolyamok',
    description: 'Title of the feeds section on the settings page',
  },
  feedsAddNew: {
    id: 'settings.feedsAddNew',
    defaultMessage: 'Új hírfolyam hozzáadása',
    description: 'Label for the button for adding new feed to the feeds list',
  },
  feedsRestore: {
    id: 'settings.feedsRestore',
    defaultMessage: 'Alapértelmezett hírfolyamok visszaállítása',
    description: 'Label for the button for restoring default feeds to the feeds list',
  },
  feedsRestoreConfirm: {
    id: 'settings.feedsRestoreConfirm',
    defaultMessage: 'Az alapértelmezett hírfolyamok visszaállítása törölni fogja az összes egyéni beállításodat.',
    description: 'Label explaining the impact of restoring default feeds',
  },
  zapsRestoreConfirm: {
    id: 'settings.zapsRestoreConfirm',
    defaultMessage: 'Ez a művelet visszaállítja az összes zap beállításodat az alapértékekre.',
    description: 'Label explaining the impact of restoring default zaps',
  },
  zapEmojiFilterTitle: {
    id: 'settings.zapEmojiFilterTitle',
    defaultMessage: 'Válassz egy emojit',
    description: 'Title for the select emoji modal',
  },
  zapEmojiFilterPlaceholder: {
    id: 'settings.zapEmojiFilterPlaceholder',
    defaultMessage: 'Keresés...',
    description: 'Placeholder for the emoji modal filter',
  },
  feedLatest: {
    id: 'feeds.feedLatest',
    defaultMessage: 'Legfrissebb',
    description: 'Label for the `latest;following` (active user\'s) feed',
  },
  feedLatestWithReplies: {
    id: 'feeds.feedLatestWithReplies',
    defaultMessage: 'Legfrissebb válaszokkal',
    description: 'Label for the `latest;following` with `include_replies` flag (active user\'s) feed',
  },
  zaps: {
    id: 'settings.sections.zaps',
    defaultMessage: 'Zappok',
    description: 'Title of the zaps section on the settings page',
  },
  notifications: {
    title: {
      id: 'pages.settings.sections.notifications',
      defaultMessage: 'Értesítések',
      description: 'Title of the notifications section on the settings page',
    },
    core: {
      id: 'settings.sections.notifications.core',
      defaultMessage: 'Alapértesítések:',
      description: 'Title of the notification settings sub-section for core notifications',
    },
    yourMentions: {
      id: 'settings.sections.notifications.yourMentions',
      defaultMessage: 'Bejegyzés, amiben megemlítettek:',
      description: 'Title of the notification settings sub-section for notes you were mentioned in',
    },
    yourPostMentions: {
      id: 'settings.sections.notifications.yourPostMentions',
      defaultMessage: 'Bejegyzés, amiben a bejegyzésedet említették:',
      description: 'Title of the notification settings sub-section for notes your note was mentioned in',
    },
  },
  profile: {
    title: {
      id: 'pages.settings.profile.title',
      defaultMessage: 'Profil szerkesztése',
      description: 'Title of the edit profile page',
    },
    uploadAvatar: {
      id: 'pages.settings.profile.uploadAvatar',
      defaultMessage: 'Avatar feltöltése',
      description: 'Label for avatar upload on edit profile page',
    },
    uploadBanner: {
      id: 'pages.settings.profile.uploadBanner',
      defaultMessage: 'Banner feltöltése',
      description: 'Label for banner upload on edit profile page',
    },
    displayName: {
      label: {
        id: 'pages.settings.profile.displayName.label',
        defaultMessage: 'Megjelenített név',
        description: 'Label for display name input on edit profile page',
      },
      help: {
        id: 'pages.settings.profile.displayName.help',
        defaultMessage: 'Válassz egy hosszabb megjelenített nevet (pl. „Kiss Pista”)',
        description: 'Help for displayName input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.displayName.placeholder',
        defaultMessage: 'Adja meg a megjelenített nevet',
        description: 'Placeholder for display name input on edit profile page',
      },
    },
    required: {
      id: 'pages.settings.profile.reqired',
      defaultMessage: '(kötelező)',
      description: 'Label indicating an input is required',
    },
    name: {
      label: {
        id: 'pages.settings.profile.name.label',
        defaultMessage: 'Felhasználónév',
        description: 'Label for name input on edit profile page',
      },
      help: {
        id: 'pages.settings.profile.name.help',
        defaultMessage: 'Válassz egy rövid felhasználói nevet (pl. „kisspista”)',
        description: 'Help for name input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.name.placeholder',
        defaultMessage: 'Adja meg a felhasználónevet',
        description: 'Placeholder for name input on edit profile page',
      },
      error: {
        id: 'pages.settings.profile.name.error',
        defaultMessage: 'Szóközök és speciális karakterek nem használhatók a felhasználónévben.',
        description: 'Error label for name input on edit profile page',
      },
      formError: {
        id: 'pages.settings.profile.name.formError',
        defaultMessage: 'A felhasználónév érvénytelen.',
        description: 'Error label for invalid form on edit profile page',
      },
    },
    website: {
      label: {
        id: 'pages.settings.profile.website.label',
        defaultMessage: 'Weboldal',
        description: 'Label for website input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.website.placeholder',
        defaultMessage: 'https://www.azenoldalam.com',
        description: 'Placeholder for website input on edit profile page',
      },
    },
    about: {
      label: {
        id: 'pages.settings.profile.about.label',
        defaultMessage: 'Rólam',
        description: 'Label for about input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.about.placeholder',
        defaultMessage: 'Mondj valamit magadról',
        description: 'Placeholder for about input on edit profile page',
      },
    },
    lud16: {
      label: {
        id: 'pages.settings.profile.lud16.label',
        defaultMessage: 'Bitcoin Lightning cím',
        description: 'Label for lud16 input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.lud16.placeholder',
        defaultMessage: 'Add meg a LN címedet',
        description: 'Placeholder for lud16 input on edit profile page',
      },
    },
    nip05: {
      label: {
        id: 'pages.settings.profile.nip05.label',
        defaultMessage: 'Ellenőrzött Noszter cím (NIP-05)',
        description: 'Label for nip-05 input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.nip05.placeholder',
        defaultMessage: 'Add meg az ellenőrzött Noszter azonosítódat',
        description: 'Placeholder for nip-05 input on edit profile page',
      },
    },
    picture: {
      label: {
        id: 'pages.settings.profile.picture.label',
        defaultMessage: 'Avatar kép URL',
        description: 'Label for avatar input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.picture.placeholder',
        defaultMessage: 'Add meg az avatarod URL-jét',
        description: 'Placeholder for avatar input on edit profile page',
      },
    },
    banner: {
      label: {
        id: 'pages.settings.profile.banner.label',
        defaultMessage: 'Banner kép URL',
        description: 'Label for banner input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.banner.placeholder',
        defaultMessage: 'Add meg a bannered URL-jét',
        description: 'Placeholder for banner input on edit profile page',
      },
    },
  },
};

export const scopeDescriptors: Record<string, ScopeDescriptor> = {
  follows: {
    caption: {
      id: 'explore.scopes.follows.caption',
      defaultMessage: 'követések',
      description: 'Caption for the follows scope',
    },
    label: {
      id: 'explore.scopes.follows.label',
      defaultMessage: 'Saját követéseim',
      description: 'Label for the follows scope',
    },
    description: {
      id: 'explore.scopes.follows.description',
      defaultMessage: 'Az általad követett fiókok',
      description: 'Description of the follows scope description',
    },
  },
  tribe: {
    caption: {
      id: 'explore.scopes.tribe.caption',
      defaultMessage: 'Törzs',
      description: 'Caption for the tribe scope',
    },
    label: {
      id: 'explore.scopes.tribe.label',
      defaultMessage: 'Saját törzsem',
      description: 'Label for the tribe scope',
    },
    description: {
      id: 'explore.scopes.tribe.description',
      defaultMessage: 'Az általad követett fiókok <div>+ a követőid</div>',
      description: 'Description of the tribe scope description',
    },
  },
  network: {
    caption: {
      id: 'explore.scopes.network.caption',
      defaultMessage: 'Hálózat',
      description: 'Caption for the network scope',
    },
    label: {
      id: 'explore.scopes.network.label',
      defaultMessage: 'Saját hálózatom',
      description: 'Label for the network scope',
    },
    description: {
      id: 'explore.scopes.network.description',
      defaultMessage: 'Az általad követett fiókok <div>+ mindenki, akiket ők követnek</div>',
      description: 'Description of the network scope description',
    },
  },
  global: {
    caption: {
      id: 'explore.scopes.global.caption',
      defaultMessage: 'Globális',
      description: 'Caption for the global scope',
    },
    label: {
      id: 'explore.scopes.global.label',
      defaultMessage: 'Globális',
      description: 'Label for the global scope',
    },
    description: {
      id: 'explore.scopes.global.description',
      defaultMessage: 'Az összes Noszter fiók',
      description: 'Description of the global scope description',
    },
  },
};

export const timeframeDescriptors: Record<string, MessageDescriptor> = {
  latest: {
    id: 'explore.timeframes.latest.caption',
    defaultMessage: 'Legfrissebb',
    description: 'Caption for the latest timeframe',
  },
  trending: {
    id: 'explore.timeframes.trending.caption',
    defaultMessage: 'Felkapott',
    description: 'Caption for the trending timeframe',
  },
  popular: {
    id: 'explore.timeframes.popular.caption',
    defaultMessage: 'Népszerű',
    description: 'Caption for the popular timeframe',
  },
  mostzapped: {
    id: 'explore.timeframes.mostzapped.caption',
    defaultMessage: 'Zappolva',
    description: 'Caption for the mostzapped timeframe',
  },
};

export const toastZapFail = {
  id: 'toast.zapFail',
  defaultMessage: 'Nem sikerült elküldeni ezt a Zappot',
  description: 'Toast message indicating failed zap',
};


export const toastZapProfile = {
  id: 'toast.zapProfile',
  defaultMessage: '{name} sikeresen zappolva',
  description: 'Toast message indicating successful zap',
};

export const thread = {
  sidebar: {
    id: 'thread.sidebar',
    defaultMessage: 'Válaszoltak erre a bejegyzésre',
    description: 'Title of the Thread page sidebar',
  },
  sidebarMentions: {
    id: 'thread.sidebarMentions',
    defaultMessage: 'Emberek ebben a bejegyzésben',
    description: 'Title of the Thread page sidebar',
  },
  pageTitle: {
    id: 'thread.page.title',
    defaultMessage: '{name} bejegyzése',
    description: 'Title of the Thread page sidebar',
  },
};

export const toast = {
  addFeedToHomeSuccess: {
    id: 'toasts.addFeedToHome.success',
    defaultMessage: '"{name}" hozzáadva a kezdőlapodhoz',
    description: 'Toast message confirming successfull adding of the feed to home to the list of available feeds',
  },
  removeFeedFromHomeSuccess: {
    id: 'toasts.removeFeedToHome.success',
    defaultMessage: '"{name}" eltávolítva a kezdőlapodról',
    description: 'Toast message confirming successfull removal of the feed from home\'s list of available feeds',
  },
  fileTypeUpsupported: {
    id: 'toast.unsupportedFileType',
    defaultMessage: 'Csak képeket és videókat tölthetsz fel. Ez a fájltípus nem támogatott.',
    description: 'Feedback when user tries to upload an unsupported file type',
  },
  publishNoteSuccess: {
    id: 'toast.publishNoteSuccess',
    defaultMessage: 'Bejegyzés sikeresen közzétéve',
    description: 'Toast message confirming successfull publication of the note',
  },
  publishNoteTimeout: {
    id: 'toast.publishNoteTimeout',
    defaultMessage: 'Egyik relé sem erősítette meg a bejegyzésed fogadását 8 másodperc után',
    description: 'Toast message indicating that no relay confirmed note reception',
  },
  publishNoteFail: {
    id: 'toast.publishNoteFail',
    defaultMessage: 'Nem sikerült közzétenni a bejegyzést',
    description: 'Toast message indicating that note publishing has failed',
  },
  noRelays: {
    id: 'toast.noRelays',
    defaultMessage: 'Legalább egy relét meg kell adnod ehhez a művelethez',
    description: 'Toast message indicating user has no relays configured',
  },
  noRelaysConnected: {
    id: 'toast.noRelaysConnected',
    defaultMessage: 'Próbálunk csatlakozni a reléidhez. Kérlek, próbáld meg újra néhány pillanat múlva.',
    description: 'Toast message indicating user is not connected to aany relay',
  },
  noExtension: {
    id: 'toast.noExtension',
    defaultMessage: 'A Noszter bővítmény szükséges események küldéséhez',
    description: 'Toast message indicating no extension was found',
  },
  noteNostrLinkCoppied: {
    id: 'toast.noteNostrLinkCoppied',
    defaultMessage: 'Bejegyzés Noszter linkje másolva',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalLinkCoppied: {
    id: 'toast.notePrimalLinkCoppied',
    defaultMessage: 'Bejegyzés linkje másolva',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalTextCoppied: {
    id: 'toast.notePrimalTextCoppied',
    defaultMessage: 'Bejegyzés szövege másolva',
    description: 'Confirmation message that the note\'s text has been copied',
  },
  noteIdCoppied: {
    id: 'toast.noteIdCoppied',
    defaultMessage: 'Bejegyzés azonosítója másolva',
    description: 'Confirmation message that the note\'s id has been copied',
  },
  noteRawDataCoppied: {
    id: 'toast.noteRawDataCoppied',
    defaultMessage: 'Bejegyzés nyers adatai másolva',
    description: 'Confirmation message that the note\'s raw data has been copied',
  },
  noteAuthorNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'Bejegyzés szerzőjének npub-ja másolva',
    description: 'Confirmation message that the note\'s author npub has been copied',
  },
  profileNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'Felhasználó npub másolva',
    description: 'Confirmation message that the user\'s npub has been copied',
  },
  noteBroadcastSuccess: {
    id: 'toast.noteBroadcastSuccess',
    defaultMessage: 'A bejegyzésed közvetítve lett a reléid felé',
    description: 'Confirmation message that the note has been broadcasted',
  },
  noteBroadcastFail: {
    id: 'toast.noteBroadcastFail',
    defaultMessage: 'Nem sikerült a bejegyzés közvetítése',
    description: 'Failure message that the note has not been broadcasted',
  },
  repostSuccess: {
    id: 'toast.repostSuccess',
    defaultMessage: 'Sikeresen újramegosztva',
    description: 'Toast message indicating successfull repost',
  },
  repostFailed: {
    id: 'toast.repostFailed',
    defaultMessage: 'Nem sikerült az újra megosztás',
    description: 'Toast message indicating failed repost',
  },
  noteAuthorReported: {
    id: 'toast.noteAuthorReported',
    defaultMessage: '{name} felhasználó jelentve',
    description: 'Toast message indicating successfull user report',
  },
  zapAsGuest: {
    id: 'toast.zapAsGuest',
    defaultMessage: 'Be kell jelentkezned a zappoláshoz',
    description: 'Toast message indicating user must be logged-in to perform a zap',
  },
  zapUnavailable: {
    id: 'toast.zapUnavailable',
    defaultMessage: 'Ennek a bejegyzésnek a szerzője nem zappolható',
    description: 'Toast message indicating user cannot receieve a zap',
  },
  zapDVMUnavailable: {
    id: 'toast.zapDVMUnavailable',
    defaultMessage: 'Ennek a hírfolyamnak a szerzője nem zappolható',
    description: 'Toast message indicating user cannot receieve a zap',
  },
  updateProfileSuccess: {
    id: 'toast.updateProfileSuccess',
    defaultMessage: 'Profil sikeresen frissítve',
    description: 'Toast message indicating that profile was successfully updated',
  },
  updateProfileFail: {
    id: 'toast.updateProfileFail',
    defaultMessage: 'Nem sikerült frissíteni a profilt, kérlek próbáld újra',
    description: 'Toast message indicating that profile has failed to updated',
  },
};

export const zapCustomOption = {
  id: 'zap.custom.option',
  defaultMessage: 'Zappold {user} felhasználót ',
  description: 'Caption for custom zap amount modal',
};

export const zapCustomAmount = {
  id: 'zap.custom.amount',
  defaultMessage: 'Egyéni összeg:',
  description: 'Caption for custom zap amount input',
};

export const errors = {
  invalidRelayUrl: {
    id: 'placeholders.invalidRelayUrl',
    defaultMessage: 'Érvénytelen URL',
    description: 'Error text for invalid url',
  },
};

export const unknown = {
  id: 'unknown',
  defaultMessage: 'ISMERETLEN',
  description: 'Error text for Unknown',
};

export const emojiGroups = {
  preset: {
    id: 'emoji.recent',
    defaultMessage: 'Nemrég használt',
    description: 'Recently used emoji group title',
  },
  face: {
    id: 'emoji.face',
    defaultMessage: 'Arcok',
    description: 'Faces emoji group title',
  },
};

export const upload = {
  fail: {
    id: 'upload.fail',
    defaultMessage: 'Nem sikerült feltölteni a fájlt: {file}',
    description: 'Error feedback when upload fails',
  },
  fileTooBigRegular: {
    id: 'upload.fileTooBigRegular',
    defaultMessage: 'Túl nagy fájl. A feltöltési limit 100MB.',
    description: 'Error feedback when file is too big for regular users',
  },
  fileTooBigPremium: {
    id: 'upload.fileTooBigPremium',
    defaultMessage: 'Túl nagy fájl. A feltöltési limit 1GB.',
    description: 'Error feedback when file is too big for premiumUsers',
  },
};

export const landing = {
  tagline: {
    id: 'landing.tagline',
    defaultMessage: 'A Közösségi Bitcoin Tárca',
    description: 'Landing page tagline',
  },
  description: {
    id: 'landing.description',
    defaultMessage: 'A nyílt protokollok a pénz és a beszéd világát is megváltoztatják. Csatlakozz a forradalomhoz.',
    description: 'Landing page description',
  },
  browserOption: {
    id: 'landing.browserOption',
    defaultMessage: 'Folytatás a böngészőben',
    description: 'Landing page browser option',
  },
};

export const forgotPin = {
  title: {
    id: 'forgotPin.title',
    defaultMessage: 'Ez a művelet törölni fogja a kulcsodat',
    description: 'Forgot pin modal title',
  },
  description: {
    id: 'forgotPin.description',
    defaultMessage: 'Még mindig böngészheted a Nosztert a Primalon keresztül, de nem tudsz műveleteket végrehajtani (bejegyzések, kedvelések stb.), amíg újra be nem jelentkezel a privát kulcsoddal. Biztos, hogy folytatni szeretnéd?',
    description: 'Explanation of what happens when pin is erased',
  },
  confirm: {
    id: 'forgotPin.confirm',
    defaultMessage: 'Igen, folytatom',
    description: 'Confirm forgot pin action',
  },
  abort: {
    id: 'forgotPin.abort',
    defaultMessage: 'Mégse',
    description: 'Abort forgot pin action',
  },
};

export const followWarning = {
  title: {
    id: 'followWarning.title',
    defaultMessage: 'Ez a művelet hibát eredményezhet',
    description: 'Follow error modal title',
  },
  description: {
    id: 'followWarning.description',
    defaultMessage: 'Ha folytatod, akkor végül csak egy Noszter fiókot fogsz követni. Biztos vagy benne, hogy folytatni szeretnéd?',
    description: 'Explanation of what happens when follow error occurs',
  },
  confirm: {
    id: 'followWarning.confirm',
    defaultMessage: 'Igen, folytatom',
    description: 'Confirm forgot pin action',
  },
  abort: {
    id: 'followWarning.abort',
    defaultMessage: 'Megszakítás',
    description: 'Abort forgot pin action',
  },
};

export const reads = {
  pageTitle: {
    id: 'reads.pageTitle',
    defaultMessage: 'Olvasnivalók',
    description: 'Reads page title',
  },
};

export const bookmarks = {
  pageTitle: {
    id: 'bookmarks.pageTitle',
    defaultMessage: 'Könyvjelzők',
    description: 'Bookmarks page title',
  },
  noBookmarks: {
    id: 'bookmarks.noBookmarks',
    defaultMessage: 'Nincsenek könyvjelzőid',
    description: 'No bookmarks caption',
  },
  confirm: {
    title: {
      id: 'bookmarks.confirm.title',
      defaultMessage: 'Elmentjük az első könyvjelződ',
      description: 'Follow error modal title',
    },
    description: {
      id: 'bookmarks.confirm.description',
      defaultMessage: 'Az első nyilvános könyvjelződet készülsz menteni. Ezeket más Noszter felhasználók is láthatják. Szeretnéd folytatni?',
      description: 'Explanation of what happens when bookmark error occurs',
    },
    confirm: {
      id: 'bookmarks.confirm.confirm',
      defaultMessage: 'Könyvjelző mentése',
      description: 'Confirm forgot pin action',
    },
    abort: {
      id: 'bookmarks.confirm.abort',
      defaultMessage: 'Mégse',
      description: 'Abort forgot pin action',
    },
    titleZero: {
      id: 'bookmarks.confirm.title',
      defaultMessage: 'Utolsó könyvjelző eltávolítása',
      description: 'Follow error modal title',
    },
    descriptionZero: {
      id: 'bookmarks.confirm.description',
      defaultMessage: 'Az utolsó nyilvános könyvjelződet készülsz eltávolítani. Szeretnéd folytatni?',
      description: 'Explanation of what happens when bookmark error occurs',
    },
    confirmZero: {
      id: 'bookmarks.confirm.confirm',
      defaultMessage: 'Könyvjelző eltávolítása',
      description: 'Confirm forgot pin action',
    },
    abortZero: {
      id: 'bookmarks.confirm.abort',
      defaultMessage: 'Mégse',
      description: 'Abort forgot pin action',
    },
  }
}

export const lnInvoice = {
  pay: {
    id: 'lnInvoice.pay',
    defaultMessage: 'Fizetés',
    description: 'Pay invoice action',
  },
  title: {
    id: 'lnInvoice.title',
    defaultMessage: 'Lightning számla',
    description: 'Lightning Invoice title',
  },
  expired: {
    id: 'lnInvoice.expired',
    defaultMessage: 'Lejárt: {date} ezelőtt',
    description: 'Expired time',
  },
  expires: {
    id: 'lnInvoice.expires',
    defaultMessage: 'Lejár: {date} múlva',
    description: 'Expires time',
  },
  confirm: {
    title: {
      id: 'lnInvoice.confirm.title',
      defaultMessage: 'Biztos vagy benne?',
      description: 'Lightning invoice pay confirmation',
    },
    description: {
      id: 'lnInvoice.confirm.description',
      defaultMessage: 'Fizetés: {amount}',
      description: 'Lightning Invoice confirm description',
    },
    confirmLabel: {
      id: 'lnInvoice.confirm.confirmLabel',
      defaultMessage: 'Igen, fizetek',
      description: 'Lightning Invoice confirm button label',
    },
    abortLabel: {
      id: 'lnInvoice.confirm.abortLabel',
      defaultMessage: 'Mégse',
      description: 'Lightning Invoice confirm button label',
    },
  },

};

export const cashuInvoice = {
  redeem: {
    id: 'cashuInvoice.redeem',
    defaultMessage: 'Beváltás',
    description: 'Reedem ecash action',
  },
  pending: {
    id: 'cashuInvoice.pending',
    defaultMessage: 'Függőben',
    description: 'Pending ecash',
  },
  spent: {
    id: 'cashuInvoice.spent',
    defaultMessage: 'Elköltve',
    description: 'Spent ecash',
  },
  title: {
    id: 'cashuInvoice.title',
    defaultMessage: 'Cashu Ecash',
    description: 'Cashu Ecash title',
  },
  mint: {
    id: 'cashuInvoice.mint',
    defaultMessage: 'Kibocsátó: {url}',
    description: 'Mint url',
  },
  confirm: {
    title: {
      id: 'cashuInvoice.confirm.title',
      defaultMessage: 'Biztos vagy benne?',
      description: 'Cashu invoice pay confirmation',
    },
    description: {
      id: 'cashuInvoice.confirm.description',
      defaultMessage: 'Beváltás: {amount}',
      description: 'Cashu Invoice confirm description',
    },
    confirmLabel: {
      id: 'cashuInvoice.confirm.confirmLabel',
      defaultMessage: 'Igen, beváltom',
      description: 'Cashu Invoice confirm button label',
    },
    abortLabel: {
      id: 'cashuInvoice.confirm.abortLabel',
      defaultMessage: 'Mégse',
      description: 'Cashu Invoice confirm button label',
    },
  },

};

export const reactionsModal = {
  tabs: {
    likes: {
      id: 'reactionsModal.tabs.likes',
      defaultMessage: 'Kedvelések ({count})',
      description: 'Likes tab label in reactions modal',
    },
    zaps: {
      id: 'reactionsModal.tabs.zaps',
      defaultMessage: 'Zappok ({count})',
      description: 'Zaps tab label in reactions modal',
    },
    reposts: {
      id: 'reactionsModal.tabs.reposts',
      defaultMessage: 'Újramegosztások ({count})',
      description: 'Reposts tab label in reactions modal',
    },
    quotes: {
      id: 'reactionsModal.tabs.quotes',
      defaultMessage: 'Idézetek ({count})',
      description: 'Quotes tab label in reactions modal',
    },
  },
};

export const premium = {
  labels: {
    foreverPremium: {
      id: 'pages.premium.labes.foreverPremium',
      defaultMessage: 'Örökös Prémium',
      description: 'Forever Premium perk title',
    },
    foreverPremiumDescription: {
      id: 'pages.premium.labes.foreverPremiumDescription',
      defaultMessage: 'A prémium előfizetés a legendák számára soha nem jár le.',
      description: 'Forever Premium perk description',
    },
    privateBetaBuilds: {
      id: 'pages.premium.labes.privateBetaBuilds',
      defaultMessage: 'Privát béta verziók',
      description: 'Private Beta Builds perk title',
    },
    privateBetaBuildsDescription: {
      id: 'pages.premium.labes.privateBetaBuildsDescription',
      defaultMessage: 'Hozzáférhetsz az új funkciókhoz még a nyilvános megjelenés előtt.',
      description: 'Private Beta perk description',
    },
    moreMediaSpace: {
      id: 'pages.premium.labes.moreMediaSpace',
      defaultMessage: 'Sokkal több tárhely',
      description: 'More Media perk title',
    },
    moreMediaSpaceDescription: {
      id: 'pages.premium.labes.moreMediaSpaceDescription',
      defaultMessage: 'Szerezz 100GB Primal Prémium média tárhelyet.',
      description: 'More Media perk description',
    },
    customLegendProfile: {
      id: 'pages.premium.labes.customLegendProfile',
      defaultMessage: 'Legendás egyedi profil',
      description: 'Legendary Custom Profile perk title',
    },
    customLegendDescription: {
      id: 'pages.premium.labes.customLegendDescription',
      defaultMessage: 'Választható igazolt jelvény szín és avatár körüli fényhatás beállítása.',
      description: 'Legendary Custom Profile perk description',
    },
    legendPageCaption: {
      id: 'pages.premium.labes.legendPageCaption',
      defaultMessage: 'Adományozz 1000$-t vagy többet, és szerezd meg:',
      description: 'Legend page caption',
    },
    legendPageExplanation: {
      id: 'pages.premium.labes.legendPageExplanation',
      defaultMessage: 'A Legend szintet azoknak hoztuk létre, akik jelentős mértékben hozzájárultak a Primal fejlődéséhez.',
      description: 'Legend page explanation',
    },
    supportFirstLine: {
      id: 'pages.premium.labes.supportFirstLine',
      defaultMessage: 'Élvezed a Primalt?',
      description: 'Support label first line',
    },
    supportSecondLine: {
      id: 'pages.premium.labes.supportSecondLine',
      defaultMessage: 'Ha igen, nézd meg, hogyan tudsz',
      description: 'Support label second line',
    },
    supportCaption: {
      id: 'pages.premium.labes.supportCaption',
      defaultMessage: 'Légy részese a Noszter forradalomnak, és segíts tovább építeni ezt az ökoszisztémát.',
      description: 'Support page caption',
    },
    leaveStars: {
      id: 'pages.premium.labes.leaveStars',
      defaultMessage: 'Adj 5 csillagos értékelést',
      description: 'Support page 5 star review caption',
    },
    leaveStarsDescription: {
      id: 'pages.premium.labes.leaveStarsDescription',
      defaultMessage: 'Az App Store értékelések segítenek a Noszter alkalmazások láthatóságának növelésében ebben a korai szakaszban.',
      description: 'Support page 5 star review description',
    },
    extendSubscription: {
      id: 'pages.premium.labes.extendSubscription',
      defaultMessage: 'Előfizetés meghosszabbítása',
      description: 'Support page extend subscription caption',
    },
    extendSubscriptionDescription: {
      id: 'pages.premium.labes.extendSubscriptionDescription',
      defaultMessage: 'Hosszabbítsd meg meglévő előfizetésedet a nyugalom érdekében, és támogasd a Primal működését.',
      description: 'Support page extend subscription description',
    },
    becomeLegend: {
      id: 'pages.premium.labes.becomeLegend',
      defaultMessage: 'Legyél legenda',
      description: 'Support page become legend caption',
    },
    becomeLegendDescription: {
      id: 'pages.premium.labes.becomeLegendDescription',
      defaultMessage: 'Adományozz 1000$-t vagy többet, hogy örökös tagságot és exkluzív előnyöket szerezz!',
      description: 'Support page become legend description',
    },
  },
  actions: {
    payNow: {
      id: 'pages.premium.actions.payNow',
      defaultMessage: 'Fizess most',
      description: 'Action to pay now',
    },
    becomeLegend: {
      id: 'pages.premium.actions.becomeLegend',
      defaultMessage: 'Legyél Legendás felhasználó most',
      description: 'Action that takes user to the Become a Legend page',
    },
    getIOS: {
      id: 'pages.premium.actions.getIOS',
      defaultMessage: 'iOS alkalmazás megnyitása',
      description: 'Action that takes user to the iOS APP page',
    },
    getAndroid: {
      id: 'pages.premium.actions.getAndroid',
      defaultMessage: 'Android alkalmazás megnyitása',
      description: 'Action that takes user to the Android App page',
    },
    support: {
      id: 'pages.premium.actions.support',
      defaultMessage: 'Támogass minket',
      description: 'Action that takes user to the support page',
    },
    start: {
      id: 'pages.premium.actions.start',
      defaultMessage: 'Primal név keresése',
      description: 'Find primal name action on the premium page',
    },
    back: {
      id: 'pages.premium.actions.back',
      defaultMessage: 'Vissza',
      description: 'To the previous step on the premium page',
    },
    next: {
      id: 'pages.premium.actions.next',
      defaultMessage: 'Következő',
      description: 'To the next step on the premium page',
    },
    subscribe: {
      id: 'pages.premium.actions.subscribe',
      defaultMessage: 'Feliratkozás',
      description: 'Subscribe action on the premium page',
    },
    done: {
      id: 'pages.premium.actions.done',
      defaultMessage: 'Kész',
      description: 'Done action on the premium page',
    },
    rename: {
      id: 'pages.premium.actions.rename',
      defaultMessage: 'Átnevezés',
      description: 'To the rename step on the premium page',
    },
    changeName: {
      id: 'pages.premium.actions.changeName',
      defaultMessage: 'Változtasd meg a Primal neved',
      description: 'Change Primal name action on the premium page',
    },
    extendPlan: {
      id: 'pages.premium.actions.extendPlan',
      defaultMessage: 'Hosszabbítsd meg az előfizetésed',
      description: 'Extend your subscription action on the premium page',
    },
    renewPlan: {
      id: 'pages.premium.actions.renewPlan',
      defaultMessage: 'Újítsd meg az előfizetésed',
      description: 'Extend your subscription action on the premium page',
    },
  },
  title: {
    general: {
      id: 'pages.premium.title',
      defaultMessage: 'Primal Prémium',
      description: 'Title of the premium page',
    },
    name: {
      id: 'pages.premium.name',
      defaultMessage: 'Válassz egy Primal nevet',
      description: 'Title of the premium find name page',
    },
    subscription: {
      id: 'pages.premium.subscription',
      defaultMessage: 'Gratulálunk!',
      description: 'Title of the premium subscription page',
    },
    subscriptionSubtitle: {
      id: 'pages.premium.subscriptionSubtitle',
      defaultMessage: 'A Primal neved elérhető.',
      description: 'Subtitle of the premium subscription page',
    },
    rename: {
      id: 'pages.premium.rename',
      defaultMessage: 'Változtasd meg a Primal neved',
      description: 'Title of the premium rename page',
    },
    support: {
      id: 'pages.premium.support',
      defaultMessage: 'Támogasd a Primalt',
      description: 'Title of the premium support page',
    },
    legend: {
      id: 'pages.premium.legend',
      defaultMessage: 'Legyél Primal Legenda',
      description: 'Title of the premium legend page',
    },
    legendShort: {
      id: 'pages.premium.legendShort',
      defaultMessage: 'Primal Legenda',
      description: 'Short title of the premium legend page',
    },
    relay: {
      id: 'pages.premium.relay',
      defaultMessage: 'Primal Relé',
      description: 'Title of the premium relay page',
    },
    media: {
      id: 'pages.premium.media',
      defaultMessage: 'Média kezelése',
      description: 'Title of the premium media managment page',
    },
    contacts: {
      id: 'pages.premium.contacts',
      defaultMessage: 'Követési lista visszaállítása',
      description: 'Title of the premium recover contacts page',
    },
    content: {
      id: 'pages.premium.content',
      defaultMessage: 'Fiók biztonsági mentése',
      description: 'Title of the premium content backup page',
    },
    og: {
      id: 'pages.premium.og',
      defaultMessage: 'Primal OG',
      description: 'Title of the Primal OG page',
    },
    ogLegend: {
      id: 'pages.premium.ogLegend',
      defaultMessage: 'Primal Legenda',
      description: 'Title of the Primal Legend page',
    },
  },
  subOptions: {
    prices: {
      m7: {
        id: 'pages.premium.subOption.m7',
        defaultMessage: '7$/hó',
        description: '$7 per month',
      },
      m6: {
        id: 'pages.premium.subOption.m6',
        defaultMessage: '6$/hó',
        description: '$6 per month',
      },
    },
    durations: {
      m3: {
        id: 'pages.premium.duration.m3',
        defaultMessage: '3 hónap',
        description: '3 month duration',
      },
      m12: {
        id: 'pages.premium.duration.m12',
        defaultMessage: '12 hónap',
        description: '12 month duration',
      },
    },
    success: {
      caption: {
        id: 'pages.premium.success.caption',
        defaultMessage: 'Siker!',
        description: 'Payment success caption',
      },
      m3: {
        id: 'pages.premium.success.m3',
        defaultMessage: 'Feliratkoztál a Primal Prémiumra 3 hónapra.',
        description: 'Payment success description for 3 month plan',
      },
      m12: {
        id: 'pages.premium.success.m12',
        defaultMessage: 'Feliratkoztál a Primal Prémiumra 12 hónapra.',
        description: 'Payment success description for 12 month plan',
      },
      legend: {
        id: 'pages.premium.success.legend',
        defaultMessage: 'Mostantól Primal Legenda vagy.',
        description: 'Payment success description for legends',
      },
    }
  },
  errors: {
    nameTooShort: {
      id: 'pages.premium.error.nameTooShort',
      defaultMessage: 'A névnek legalább 3 karakter hosszúnak kell lennie.',
      description: 'Name is too short error',
    },
    nameUnavailable: {
      id: 'pages.premium.error.nameUnavailable',
      defaultMessage: 'Sajnáljuk, ez a név jelenleg nem elérhető.',
      description: 'Name is unavailable error',
    },
    nameNotChanged: {
      id: 'pages.premium.error.nameNotChanged',
      defaultMessage: 'Nem sikerült megváltoztatni a nevet.',
      description: 'Name is unavailable error',
    },
  }
};
