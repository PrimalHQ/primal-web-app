import { MessageDescriptor } from "@cookbook/solid-intl";
import { NotificationType } from "./constants";
import { ScopeDescriptor } from "./types/primal";


export const account = {
  alreadyHaveAccount: {
    id: 'account.alreadyHaveAccount',
    defaultMessage: 'Already have a Nostr account?',
    description: 'Already have a Nostr accountlabel',
  },
  prominentNostriches: {
    id: 'actions.prominentNostriches',
    defaultMessage: 'Prominent Nostriches',
    description: 'Prominent Nostriches label',
  },
  follow: {
    id: 'actions.follow',
    defaultMessage: 'follow',
    description: 'Follow button label',
  },
  unfollow: {
    id: 'actions.unfollow',
    defaultMessage: 'unfollow',
    description: 'Unfollow button label',
  },
  followAll: {
    id: 'actions.followAll',
    defaultMessage: 'follow all',
    description: 'Follow all button label',
  },
  unfollowAll: {
    id: 'actions.unfollowAll',
    defaultMessage: 'unfollow all',
    description: 'Unfollow all button label',
  },
  followFailed: {
    id: 'account.followFailed',
    defaultMessage: 'Failed to complete the follow possibly due to a network error. Please try again.',
    description: 'Feedback to user that the follow action has failed',
  },
  unfollowFailed: {
    id: 'account.unfollowFailed',
    defaultMessage: 'Failed to complete the unfollow possibly due to a network error. Please try again.',
    description: 'Feedback to user that the unfollow action has failed',
  },
  needToLogin: {
    id: 'account.needToLogin',
    defaultMessage: 'You need to be signed in to perform this action',
    description: 'Message to user that an action cannot be preformed without a public key',
  },
  createNewDescription: {
    id: 'account.createNewDescription',
    defaultMessage: 'New to Nostr? Create your account now and join this magical place. It’s quick and easy!',
    description: 'Label inviting users to join Nostr',
  },
  create: {
    title: {
      id: 'settings.account.title',
      defaultMessage: 'Create Account',
      description: 'Title of the create account page',
    },
    descriptions: {
      step_one: {
        id: 'settings.account.descriptions.step_one',
        defaultMessage: "Let’s start with the basics. Only the username is required!",
        description: 'Description on step one',
      },
      step_two: {
        id: 'settings.account.descriptions.step_two',
        defaultMessage: "Tell us a bit more about yourself. Everything on this page is optional!",
        description: 'Description on step two',
      },
      step_three: {
        id: 'settings.account.descriptions.step_three',
        defaultMessage: "We found some Nostr accounts for you to follow:",
        description: 'Description on step three',
      },
    }
  },
};

export const login = {
  title: {
    id: 'login.title',
    defaultMessage: 'Login',
    description: 'Login ',
  },
  description: {
    id: 'login.description',
    defaultMessage: 'Enter your Nostr private key (starting with “nsec”):',
    description: 'Label describing the login proccess',
  },
  invalidNsec: {
    id: 'login.invalidNsec',
    defaultMessage: 'Please enter a valid Nostr private key',
    description: 'Label informing the user of an invalid nsec key',
  },
};

export const pin = {
  title: {
    id: 'pin.title',
    defaultMessage: 'Create Pin',
    description: 'Create Pin modal title',
  },
  description: {
    id: 'pin.description',
    defaultMessage: 'Create a PIN to secure your account. You will need to enter this PIN every time you login to the Primal web app:',
    description: 'Label describing what the pin is used for',
  },
  enter: {
    id: 'pin.enter',
    defaultMessage: 'Enter your PIN to login: ',
    description: 'Label instructing the user to enter the pin',
  },
  enterTitle: {
    id: 'pin.enterTitle',
    defaultMessage: 'Enter Pin',
    description: 'Enter Pin modal title',
  },
  reEnter: {
    id: 'pin.reEnter',
    defaultMessage: 'Re-type your PIN:',
    description: 'Label instructing the user to re-enter the pin',
  },
  invalidPin: {
    id: 'pin.invalidPin',
    defaultMessage: 'PIN must be at least 4 characters',
    description: 'Label instructing the user on the valid pin requirements',
  },
  invalidRePin: {
    id: 'pin.invalidRePin',
    defaultMessage: 'PINs don\'t match',
    description: 'Label instructing the user that the two pins don\'t match',
  },
};

export const actions = {
  resetRelays: {
    id: 'actions.resetRelays',
    defaultMessage: 'Reset relays',
    description: 'Reset relays label',
  },
  seeMore: {
    id: 'actions.seeMore',
    defaultMessage: 'see more',
    description: 'See more label',
  },
  newNote: {
    id: 'actions.newNote',
    defaultMessage: 'New Note',
    description: 'New note action label',
  },
  newArticle: {
    id: 'actions.newArticle',
    defaultMessage: 'New Article',
    description: 'New article action label',
  },
  createPin: {
    id: 'actions.createPin',
    defaultMessage: 'Set PIN',
    description: 'Create PIN action, button label',
  },
  optoutPin: {
    id: 'actions.optoutPin',
    defaultMessage: 'Continue without a PIN',
    description: 'opt-out of PIN action, button label',
  },
  createAccount: {
    id: 'actions.createAccount',
    defaultMessage: 'Create Account',
    description: 'Create account action, button label',
  },
  login: {
    id: 'actions.login',
    defaultMessage: 'Login',
    description: 'Login action, button label',
  },
  loginNow: {
    id: 'actions.loginNow',
    defaultMessage: 'Login now',
    description: 'Login Now action, button label',
  },
  logout: {
    id: 'actions.logout',
    defaultMessage: 'Logout',
    description: 'Logout action, button label',
  },
  getStarted: {
    id: 'actions.getStarted',
    defaultMessage: 'Get Started',
    description: 'Get Started action, button label',
  },
  forgotPin: {
    id: 'actions.forgotPin',
    defaultMessage: 'I forgot my PIN',
    description: 'Forgot PIN action, button label',
  },
  cancel: {
    id: 'actions.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel action, button label',
  },
  copy: {
    id: 'actions.copy',
    defaultMessage: 'copy',
    description: 'Copy action, button label',
  },
  copyPubkey: {
    id: 'actions.copyPubkey',
    defaultMessage: 'copy public key',
    description: 'Copy pubkey action, button label',
  },
  copyPrivkey: {
    id: 'actions.copyPrivkey',
    defaultMessage: 'copy private key',
    description: 'Copy private key action, button label',
  },
  addFeedToHome: {
    id: 'actions.addFeedToHome',
    defaultMessage: 'add this feed to my home page',
    description: 'Add feed to home, button label',
  },
  addFeedToHomeNamed: {
    id: 'actions.addFeedToHomeNamed',
    defaultMessage: 'add {name} feed to home page',
    description: 'Add named feed to home, button label',
  },
  disabledAddFeedToHome: {
    id: 'actions.disabledHomeFeedAdd',
    defaultMessage: 'Available on your home page',
    description: 'Add feed to home label, when feed is already added',
  },
  removeFromHomeFeedNamed: {
    id: 'actions.removeFromHomeFeedNamed',
    defaultMessage: 'remove {name} feed from your home page',
    description: 'Remove named feed from home, button label',
  },
  noteCopyNostrLink: {
    id: 'actions.noteCopyNostrLink',
    defaultMessage: 'Copy Nostr link',
    description: 'Label for the copy Nostr note link context menu item',
  },
  noteCopyPrimalLink: {
    id: 'actions.noteCopyPrimalLink',
    defaultMessage: 'Copy Primal link',
    description: 'Label for the copy Primal note link context menu item',
  },
  notePostNew: {
    id: 'actions.notePostNew',
    defaultMessage: 'Post',
    description: 'Send new note, button label',
  },
  noteReply: {
    id: 'actions.noteReply',
    defaultMessage: 'reply to {name}',
    description: 'Reply to button label',
  },
  sendDirectMessage: {
    id: 'actions.sendDirectMessage',
    defaultMessage: 'send',
    description: 'Send direct message action, button label',
  },
  save: {
    id: 'actions.save',
    defaultMessage: 'save',
    description: 'Save changes action label',
  },
  previous: {
    id: 'actions.previous',
    defaultMessage: 'Previous',
    description: 'Go to previous step action label',
  },
  next: {
    id: 'actions.next',
    defaultMessage: 'Next',
    description: 'Go to next step action label',
  },
  finish: {
    id: 'actions.finish',
    defaultMessage: 'Finish',
    description: 'Finish the wizard action label',
  },
  editProfile: {
    id: 'actions.editProfile',
    defaultMessage: 'edit profile',
    description: 'Edit profile action label',
  },
  reportUserConfirm: {
    id: 'actions.reportUserConfirm',
    defaultMessage: 'Report user {name}?',
    description: 'Label for report user confirmation',
  },
  muteUserConfirm: {
    id: 'actions.muteUserConfirm',
    defaultMessage: 'Add {name} to your mute list?',
    description: 'Label for mute user confirmation',
  },
  unmute: {
    id: 'actions.unmute',
    defaultMessage: 'unmute',
    description: 'Label un-mute button',
  },
  addToAllowlist: {
    id: 'actions.addToAllowlist',
    defaultMessage: 'Add to allowlist',
    description: 'Label add-to-allowlist button',
  },
  addRelay: {
    id: 'actions.addRelay',
    defaultMessage: 'add',
    description: 'Label for add relay action',
  },
  removeRelay: {
    id: 'actions.removeRelay',
    defaultMessage: 'remove',
    description: 'Label for remove relay action',
  },
  confirmRemoveRelay: {
    id: 'actions.confirmRemoveRelay',
    defaultMessage: 'Remove <b>{url}</b> from your relay list? This will disconnect you from the relay.',
    description: 'Label for remove relay confirmation',
  },
  restoreCachingService: {
    id: 'actions.restoreCachingService',
    defaultMessage: 'Restore default caching service',
    description: 'Label for restore default caching service',
  },
  profileContext: {
    copyPubkey: {
      id: 'actions.profileContext.copyPubkey',
      defaultMessage: 'Copy user public key',
      description: 'Label for copy user\'s pubkey from profile context menu',
    },
    copyLink: {
      id: 'actions.profileContext.copyLink',
      defaultMessage: 'Copy user link',
      description: 'Label for copy user\'s link from profile context menu',
    },
    addFeed: {
      id: 'actions.profileContext.addFeed',
      defaultMessage: 'Add user feed',
      description: 'Label for adding user\'s feed to home, from profile context menu',
    },
    removeFeed: {
      id: 'actions.profileContext.removeFeed',
      defaultMessage: 'Remove user feed',
      description: 'Label for removing user\'s feed from home, from profile context menu',
    },
    muteUser: {
      id: 'actions.profileContext.muteUser',
      defaultMessage: 'Mute user',
      description: 'Label for muting user from profile context menu',
    },
    unmuteUser: {
      id: 'actions.profileContext.unmuteUser',
      defaultMessage: 'Unmute user',
      description: 'Label for unmuting user from profile context menu',
    },
    followMute: {
      id: 'actions.profileContext.followMute',
      defaultMessage: 'Follow user\'s mute list',
      description: 'Label for following user\'s mute list',
    },
    unfollowMute: {
      id: 'actions.profileContext.unfollowMute',
      defaultMessage: 'Unfollow user\'s mute list',
      description: 'Label for unfollowing user\'s mute list',
    },
    reportUser: {
      id: 'actions.profileContext.reportUser',
      defaultMessage: 'Report user',
      description: 'Label for reporting user from profile context menu',
    },
  },
  noteContext: {
    reactions: {
      id: 'actions.noteContext.reactions',
      defaultMessage: 'Reactions',
      description: 'Label for note reactions from context menu',
    },
    zap: {
      id: 'actions.noteContext.zapNote',
      defaultMessage: 'Custom Zap',
      description: 'Label for note zap from context menu',
    },
    copyLink: {
      id: 'actions.noteContext.copyLink',
      defaultMessage: 'Copy note link',
      description: 'Label for copy note link from context menu',
    },
    copyText: {
      id: 'actions.noteContext.copytext',
      defaultMessage: 'Copy note text',
      description: 'Label for copy note text from context menu',
    },
    copyId: {
      id: 'actions.noteContext.copyId',
      defaultMessage: 'Copy note ID',
      description: 'Label for copy note ID from context menu',
    },
    copyRaw: {
      id: 'actions.noteContext.copyRaw',
      defaultMessage: 'Copy raw data',
      description: 'Label for copy note raw data from context menu',
    },
    copyPubkey: {
      id: 'actions.noteContext.copyPubkey',
      defaultMessage: 'Copy user public key',
      description: 'Label for copy note author\'s pubkey from context menu',
    },
    breadcast: {
      id: 'actions.noteContext.breadcast',
      defaultMessage: 'Broadcast note',
      description: 'Label for note broadcast from context menu',
    },
    muteAuthor: {
      id: 'actions.noteContext.muteAuthor',
      defaultMessage: 'Mute user',
      description: 'Label for muting user from context menu',
    },
    unmuteAuthor: {
      id: 'actions.noteContext.unmuteAuthor',
      defaultMessage: 'Unmute user',
      description: 'Label for unmuting user from context menu',
    },
    reportAuthor: {
      id: 'actions.noteContext.reportAuthor',
      defaultMessage: 'Report user',
      description: 'Label for reporting user from context menu',
    },
    repostNote: {
      id: 'actions.noteContext.repostNote',
      defaultMessage: 'Repost note',
      description: 'Label for reposting note from context menu',
    },
    quoteNote: {
      id: 'actions.noteContext.quoteNote',
      defaultMessage: 'Quote note',
      description: 'Label for quoting note from context menu',
    },
  },
  zap: {
    id: 'actions.zap',
    defaultMessage: 'Zap',
    description: 'Label for zap',
  },
  reactions: {
    id: 'actions.reactions',
    defaultMessage: 'Reactions ({count})',
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
    defaultMessage: 'Downloads',
    description: 'Title of the downloads page',
  },
  build: {
    id: 'downloads.build',
    defaultMessage: 'Build',
    description: 'Build label',
  },
  released: {
    id: 'downloads.released',
    defaultMessage: 'released',
    description: 'Released label',
  },
  getApk: {
    id: 'downloads.getApk',
    defaultMessage: 'Get APK instead',
    description: 'APK download label',
  },
  callToActionIOSTitle: {
    id: 'downloads.ctaIOSTitle',
    defaultMessage: 'Primal iOS',
    description: 'Title for the iOS downloads\' page call-to-action',
  },
  callToActionIOSDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'The app features easy onboarding, fast & snappy UI, ability to explore Nostr, and create & manage custom feeds',
    description: 'Description for the iOS downloads\' page call-to-action',
  },
  callToActionAndroidTitle: {
    id: 'downloads.ctaAndroidTitle',
    defaultMessage: 'Primal Android',
    description: 'Title for the Android downloads\' page call-to-action',
  },
  callToActionAndroidDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'The app features easy onboarding, fast & snappy UI, ability to explore Nostr, and create & manage custom feeds',
    description: 'Description for the Android downloads\' page call-to-action',
  },
  callToActionQRTitle: {
    id: 'downloads.ctaQRTitle',
    defaultMessage: 'Scan to install app',
    description: 'Title for the QR code downloads\' page call-to-action',
  },
  appStoreCaption: {
    id: 'downloads.appStoreCaption',
    defaultMessage: 'TestFlight Available Now',
    description: 'AppStore promo caption',
  },
  playStoreCaption: {
    id: 'downloads.playStoreCaption',
    defaultMessage: 'Coming soon to Android',
    description: 'PlayStore promo caption',
  },
  apkDownload: {
    id: 'downloads.apkDownload',
    defaultMessage: 'Alpha Build Available Now',
    description: 'APK download caption',
  },
  links: {
    title: {
      id: 'downloads.sidebarTitle',
      defaultMessage: 'Source code',
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
      defaultMessage: 'Primal Caching Service',
      description: 'Label for the link to the caching service',
    },
    primalServer: {
      id: 'downloads.primalServer',
      defaultMessage: 'Primal Server',
      description: 'Label for the link to the primal server',
    },
  },
};

export const confirmDefaults = {
  title: {
    id: 'confirm.title',
    defaultMessage: 'Are you sure?',
    description: 'Default title of the confirmation dialog',
  },
  confirm: {
    id: 'confirm.yes',
    defaultMessage: 'Yes',
    description: 'Default label for positive response to the confirmation dialog',
  },
  abort: {
    id: 'confirm.no',
    defaultMessage: 'No',
    description: 'Default label for negative response to the confirmation dialog',
  },
  cancel: {
    id: 'confirm.cancel',
    defaultMessage: 'Cancel',
    description: 'Default label for cancel response to the confirmation dialog',
  },
};

export const exploreSidebarCaption = {
  id: 'explore.sidebar.caption',
  defaultMessage: 'trending users',
  description: 'Caption for the explore page sidebar showing a list of trending users',
};

export const explore = {
  genericCaption: {
    id: 'explore.genericCaption',
    defaultMessage: 'explore',
    description: 'Generic caption for the explore page',
  },
  pageTitle: {
    id: 'explore.pageTitle',
    defaultMessage: 'Explore',
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
      defaultMessage:'Users',
      description: 'Label for number of users stats',
    },
    pubkeys: {
      id: 'explore.stats.pubkeys',
      defaultMessage: 'Public Keys',
      description: 'Label for number of pubkeys stats',
    },
    zaps: {
      id: 'explore.stats.zaps',
      defaultMessage: 'Zaps',
      description: 'Label for number of zaps stats',
    },
    btcZapped: {
      id: 'explore.stats.btcZapped',
      defaultMessage: 'BTC Zapped',
      description: 'Label for number of zapped bitcoins stats',
    },
    pubnotes: {
      id: 'explore.stats.pubnotes',
      defaultMessage: 'Public Notes',
      description: 'Label for number of public notes stats',
    },
    reposts: {
      id: 'explore.stats.reposts',
      defaultMessage: 'Reposts',
      description: 'Label for number of repost stats',
    },
    reactions: {
      id: 'explore.stats.reactions',
      defaultMessage: 'Reactions',
      description: 'Label for number of reactions stats',
    },
    any: {
      id: 'explore.stats.any',
      defaultMessage: 'All Events',
      description: 'Label for number of all stats',
    },
  }
};

export const feedProfile = {
  id: 'feedProfile',
  defaultMessage: '{name}\'s feed',
  description: 'Generic name for a feed created from a profile',
};

export const feedProfileDesription = {
  id: 'feedProfileDesription',
  defaultMessage: 'Notes feed of {name}',
  description: 'Generic description for a feed created from a profile',
};

export const feedNewPosts = {
  id: 'feed.newPosts',
  defaultMessage: `{number, plural,
    =0 {}
    one {# New Note}
    =99 {99+ New Notes}
    other {# New Notes}}`,
  description: 'Label for a button to load new notes',
};

export const feedback = {
  dropzone: {
    id: 'feedback.dropzone',
    defaultMessage: 'drop file to upload',
    description: 'Label accompanying the draging file'
  },
  uploading: {
    id: 'feedback.uploading',
    defaultMessage: 'uploading...',
    description: 'Label accompanying the uploading spinner'
  },
};

export const home = {
  trending: {
    id: 'home.sidebar.caption.trending',
    defaultMessage: 'Trending',
    description: 'Caption for the home page sidebar showing a list of trending notes',
  },
  mostZapped: {
    id: 'home.sidebar.caption.mostzapped',
    defaultMessage: 'Most Zapped',
    description: 'Caption for the home page sidebar showing a list of most zapped notes',
  },
  zapPostfix: {
    id: 'home.sidebar.note.zaps',
    defaultMessage: '{zaps} zaps, {sats} sats',
    description: 'Zaps data for a small note on home sidebar',
  },
};

export const messages = {
  title: {
    id: 'messages.title',
    defaultMessage: 'Messages',
    description: 'Title of messages page',
  },
  follows: {
    id: 'messages.follows',
    defaultMessage: 'follows',
    description: 'DM relation selection label for follows',
  },
  other: {
    id: 'messages.other',
    defaultMessage: 'other',
    description: 'DM relation selection label for other',
  },
  markAsRead: {
    id: 'messages.markAsRead',
    defaultMessage: 'Mark All Read',
    description: 'DM mark as read label',
  },
};

export const navBar = {
  home: {
    id: 'navbar.home',
    defaultMessage: 'Home',
    description: 'Label for the nav bar item link to Home page',
  },
  reads: {
    id: 'navbar.reads',
    defaultMessage: 'Reads',
    description: 'Label for the nav bar item link to Reads page',
  },
  explore: {
    id: 'navbar.explore',
    defaultMessage: 'Explore',
    description: 'Label for the nav bar item link to Explore page',
  },
  messages: {
    id: 'navbar.messages',
    defaultMessage: 'Messages',
    description: 'Label for the nav bar item link to Messages page',
  },
  bookmarks: {
    id: 'navbar.bookmarks',
    defaultMessage: 'Bookmarks',
    description: 'Label for the nav bar item link to Bookmarks page',
  },
  notifications: {
    id: 'navbar.notifications',
    defaultMessage: 'Notifications',
    description: 'Label for the nav bar item link to Notifications page',
  },
  downloads: {
    id: 'navbar.downloads',
    defaultMessage: 'Downloads',
    description: 'Label for the nav bar item link to Downloads page',
  },
  premium: {
    id: 'navbar.premium',
    defaultMessage: 'Premium',
    description: 'Label for the nav bar item link to Premium page',
  },
  settings: {
    id: 'navbar.settings',
    defaultMessage: 'Settings',
    description: 'Label for the nav bar item link to Settings page',
  },
  help: {
    id: 'navbar.help',
    defaultMessage: 'Help',
    description: 'Label for the nav bar item link to Help page',
  },
};

export const note = {
  newPreview: {
    id: 'note.newPreview',
    defaultMessage: 'Note preview',
    description: 'Caption for preview when creating a new note'
  },
  mentionIndication: {
    id: 'note.mentionIndication',
    defaultMessage: '\[note by {name}\]',
    description: 'Label indicating that a note has been metioned in the small note display'
  },
  reposted: {
    id: 'note.reposted',
    defaultMessage: 'Reposted',
    description: 'Label indicating that the note is a repost',
  },
  repostedOthers: {
    id: 'note.repostedOthers',
    defaultMessage: `{number, plural,
      =0 {}
      one { and # other}
      other { and # others}}`,
    description: 'Label indicating that the note is reposted more than once',
  },
  reply: {
    id: 'note.reply',
    defaultMessage: 'replying to',
    description: 'Label indicating that the note is a reply',
  },
  saveNoteDraft: {
    title: {
      id: 'note.saveNoteDraft.title',
      defaultMessage: 'Save Note Draft?',
      description: 'Title of the confirmation when the note is canceled',
    },
    description: {
      id: 'note.saveNoteDraft.description',
      defaultMessage: 'Do you wish to save this note to continue editing it later?',
      description: 'Description of the confirmation when the note is canceled',
    },
    optionYes: {
      id: 'note.saveNoteDraft.yes',
      defaultMessage: 'Save',
      description: 'Confirm saving not as draft',
    },
    optionNo: {
      id: 'note.saveNoteDraft.no',
      defaultMessage: 'Discard',
      description: 'Decline saving not as draft',
    },
    optionCancel: {
      id: 'note.saveNoteDraft.cancel',
      defaultMessage: 'Continue Editing',
      description: 'Continue editing the note',
    },
  },
};

export const notificationTypeTranslations: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'followed you',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'unfollowed you',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'zapped your note',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'liked your note',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'reposted your note',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'replied to your note',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'mentioned you in a note',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'mentioned your note',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'zapped a note you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'liked a note you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'reposted a note you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a note you were mentioned in',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'zapped a note your note was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'liked a note your note was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'reposted a note your note was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a note your note was mentioned in',
}

export const notificationsNew: Record<number, MessageDescriptor> = Object.values(NotificationType).reduce((acc, type) => ({
  ...acc,
  [type]: {
    id: `notifications.new.${type}`,
    defaultMessage: `{number, plural,
      =0 {}
      one {and # other}
      other {and # others}}
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
    defaultMessage: 'Reactions',
    description: 'Sidebar activities stats caption on the notification page',
  },
  heading: {
    id: 'notificationsSidebar.heading',
    defaultMessage: 'Summary',
    description: 'Sidebar caption on the notification page',
  },
  empty: {
    id: 'notificationsSidebar.empty',
    defaultMessage: 'No new notifications',
    description: 'Sidebar caption indicating no new notifications',
  },
  followers: {
    id: 'notificationsSidebar.followers',
    defaultMessage: 'Followers',
    description: 'Sidebar follower stats caption on the notification page',
  },
  gainedFollowers: {
    id: 'notificationsSidebar.gainedFollowers',
    defaultMessage: `new {number, plural,
      =0 {}
      one {follower}
      other {followers}}`,
    description: 'Sidebar new follower stats description on the notification page',
  },
  lostFollowers: {
    id: 'notificationsSidebar.lostFollowers',
    defaultMessage: `lost {number, plural,
      =0 {}
      one {follower}
      other {followers}}`,
    description: 'Sidebar lost follwers stats description on the notification page',
  },
  likes: {
    id: 'notifications.sidebar.likes',
    defaultMessage: `{number, plural,
      =0 {}
      one {like}
      other {likes}}`,
    description: 'Sidebar likes stats caption on the notification page',
  },
  mentions: {
    id: 'notifications.sidebar.mentions',
    defaultMessage: 'Mentions',
    description: 'Sidebar mentions stats caption on the notification page',
  },
  mentionsYou: {
    id: 'notifications.sidebar.mentionsYou',
    defaultMessage: `{number, plural,
      =0 {}
      one {mention}
      other {mentions}} of you`,
    description: 'Sidebar mentions you stats description on the notification page',
  },
  mentionsYourPost: {
    id: 'notifications.sidebar.mentionsYourPost',
    defaultMessage: `{number, plural,
      =0 {}
      one {mention of your note}
      other {mentions of your notes}}`,
    description: 'Sidebar mentions your note stats description on the notification page',
  },
  replies: {
    id: 'notifications.sidebar.replies',
    defaultMessage: `{number, plural,
      =0 {}
      one {reply}
      other {replies}}`,
    description: 'Sidebar replies stats caption on the notification page',
  },
  reposts: {
    id: 'notifications.sidebar.reposts',
    defaultMessage: `{number, plural,
      =0 {}
      one {repost}
      other {reposts}}`,
    description: 'Sidebar reposts stats caption on the notification page',
  },
  other: {
    id: 'notifications.sidebar.other',
    defaultMessage: 'Other',
    description: 'Sidebar other stats caption on the notification page',
  },
  zaps: {
    id: 'notificationsSidebar.zaps',
    defaultMessage: 'Zaps',
    description: 'Sidebar zaps stats caption on the notification page',
  },
  zapNumber: {
    id: 'notificationsSidebar.zapNumber',
    defaultMessage: `{number, plural,
      =0 {}
      one {zap}
      other {zaps}}`,
    description: 'Sidebar zaps stats description on the notification page',
  },
  statsNumber: {
    id: 'notificationsSidebar.statsNumber',
    defaultMessage: `{number, plural,
      =0 {}
      one {sat}
      other {sats}}`,
    description: 'Sidebar sats stats description on the notification page',
  },
};

export const notifications = {
  title: {
    id: 'pages.notifications.title',
    defaultMessage: 'Notifications',
    description: 'Title of the notifications page',
  },
  newNotifs: {
    id: 'notification.newNotifs',
    defaultMessage: `{number, plural,
      =0 {}
      one {# new notification}
      =100 {99+ new notifications}
      other {# new notifications}}`,
    description: 'Label for a button to load new notifications',
  },
  all: {
    id: 'pages.notifications.all',
    defaultMessage: 'All',
    description: 'Title of the All notifications tab',
  },
  zaps: {
    id: 'pages.notifications.zaps',
    defaultMessage: 'Zaps',
    description: 'Title of the Zaps notifications tab',
  },
  replies: {
    id: 'pages.notifications.replies',
    defaultMessage: 'Replies',
    description: 'Title of the Replies notifications tab',
  },
  mentions: {
    id: 'pages.notifications.mentions',
    defaultMessage: 'Mentions',
    description: 'Title of the Mentions notifications tab',
  },
  reposts: {
    id: 'pages.notifications.reposts',
    defaultMessage: 'Reposts',
    description: 'Title of the Reposts notifications tab',
  },
};

export const placeholders = {
  missingNote: {
    firstLine: {
      id: 'placeholders.missingNote.firstLine',
      defaultMessage: 'We can\'t seem to find this note.',
      description: 'Placeholder when the note is missing',
    },
    secondLine: {
      id: 'placeholders.missingNote.secondLine',
      defaultMessage: 'It may have been deleted by the author.',
      description: 'Placeholder when the note is missing',
    },
  },
  noReactionDetails: {
    id: 'placeholders.noReactionDetails',
    defaultMessage: 'No details for rections found',
    description: 'Placeholder when there are no reaction details in reactions modal',
  },
  noLikeDetails: {
    id: 'placeholders.noLikeDetails',
    defaultMessage: 'No details for likes found',
    description: 'Placeholder when there are no like details in reactions modal',
  },
  noZapDetails: {
    id: 'placeholders.noZapDetails',
    defaultMessage: 'No details for zaps found',
    description: 'Placeholder when there are no zap details in reactions modal',
  },
  noRepostDetails: {
    id: 'placeholders.noRepostDetails',
    defaultMessage: 'No details for reposts found',
    description: 'Placeholder when there are no repost details in reactions modal',
  },
  noQuoteDetails: {
    id: 'placeholders.noQuoteDetails',
    defaultMessage: 'No details for quotes found',
    description: 'Placeholder when there are no quote details in reactions modal',
  },
  addComment: {
    id: 'placeholders.addComment',
    defaultMessage: 'Add a comment...',
    description: 'Placeholder for adding a comment',
  },
  searchByNpub: {
    id: 'placeholders.searchByNpub',
    defaultMessage: 'search by npub...',
    description: 'Placeholder for searching by npub',
  },
  addNpub: {
    id: 'placeholders.addNpub',
    defaultMessage: 'add npub...',
    description: 'Placeholder for adding npub',
  },
  mustHaveOneCachingService: {
    id: 'placeholders.mustHaveOneCachingService',
    defaultMessage: 'At this time, client needs to have at least one caching service to operate. In the future we will add the ability to use Primal without a caching service, but this is not yet supported.',
    description: 'Description when trying to remove the last caching service from the pool',
  },
  cachingPoolHelp: {
    id: 'placeholders.cachingPoolHelp',
    defaultMessage: 'Client will randomly connect to one of the caching services in this pool. This helps with fail-over if some of the services are down. You can add or remove services. If you wish to always connect to exatly one caching service, you should leave only one entry in this pool.',
    description: 'text for caching pool help bubble',
  },
  resetRelaysHelp: {
    id: 'placeholders.resetRelaysHelp',
    defaultMessage: 'This action will disconnect you from any relays you are currently connected to and connect you to a set of recomended relays.',
    description: 'text for caching pool help bubble',
  },
  comingSoon: {
    id: 'placeholders.comingSoon',
    defaultMessage: 'Coming soon. Seriously. Help is on the way. ;)',
    description: 'Placholder text for missing content',
  },
  endOfFeed: {
    id: 'placeholders.endOfFeed',
    defaultMessage: 'Your reached the end. You are a quick reader',
    description: 'Message displayed when user reaches the end of the feed',
  },
  guestUserGreeting: {
    id: 'placeholders.guestUserGreeting',
    defaultMessage: 'Welcome to nostr!',
    description: 'Header placeholder for guest user',
  },
  noteCallToAction: {
    id: 'placeholders.callToAction.note',
    defaultMessage: 'Say something on nostr...',
    description: 'Placeholder for new note call-to-action',
  },
  pageWIPTitle: {
    id: 'pages.wip.title',
    defaultMessage: '{title}',
    description: 'Title of page under construction',
  },
  welcomeMessage: {
    id: 'placeholders.welcomeMessage',
    defaultMessage: 'Welcome to nostr!',
    description: 'Default welcome message',
  },
  findUser: {
    id: 'placeholders.findUser',
    defaultMessage: 'find user',
    description: 'Find user input placeholder',
  },
  findUsers: {
    id: 'placeholders.findUsers',
    defaultMessage: 'find users',
    description: 'Find users input placeholder',
  },
  search: {
    id: 'placeholders.search',
    defaultMessage: 'Search...',
    description: 'Search input placeholder',
  },
  selectFeed: {
    id: 'placeholders.selectFeed',
    defaultMessage: 'Select feed',
    description: 'Placeholder for feed selection',
  },
  pageNotFound: {
    id: 'placeholders.pageNotFound',
    defaultMessage: 'Page not found',
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
    defaultMessage: 'Latest Reads',
    description: 'Caption for the profile page sidebar showing a list of latest reads by the profile',
  },
  sidebarCaptionNotes: {
    id: 'profile.sidebar.captionNotes',
    defaultMessage: 'Popular Notes',
    description: 'Caption for the profile page sidebar showing a list of trending notes by the profile',
  },
  sidebarNoNotes: {
    id: 'profile.sidebar.noNotes',
    defaultMessage: 'No trending notes',
    description: 'Placeholde for profile sidebar when the profile is missing trending notes',
  },
  title: {
    id: 'profile.title',
    defaultMessage: '{name} - Nostr Profile',
    description: 'Page title for Profile page'
  },
  followsYou: {
    id: 'profile.followsYou',
    defaultMessage: 'Follows you',
    description: 'Label indicating that a profile is following your profile',
  },
  jointDate: {
    id: 'profile.joinDate',
    defaultMessage: 'Joined Nostr on {date}',
    description: 'Label indicating when the profile joined Nostr (oldest event)',
  },
  stats: {
    gallery: {
      id: 'profile.gallery',
      defaultMessage: 'Media',
      description: 'Label for gallery profile stat',
    },
    follow: {
      id: 'profile.followStats',
      defaultMessage: 'Following',
      description: 'Label for following profile stat',
    },
    followers: {
      id: 'profile.stats.followers',
      defaultMessage: 'Followers',
      description: 'Label for followers profile stat',
    },
    zaps: {
      id: 'profile.stats.zaps',
      defaultMessage: 'Zaps',
      description: 'Label for zaps profile stat',
    },
    sats: {
      id: 'profile.stats.sats',
      defaultMessage: 'Sats',
      description: 'Label for sats profile stat',
    },
    totalSats: {
      id: 'profile.stats.totalSats',
      defaultMessage: 'Total',
      description: 'Label for total sats profile stat',
    },
    articles: {
      id: 'profile.stats.articles',
      defaultMessage: 'Reads',
      description: 'Label for reads profile stat',
    },
    notes: {
      id: 'profile.stats.notes',
      defaultMessage: 'Notes',
      description: 'Label for notes profile stat',
    },
    replies: {
      id: 'profile.stats.replies',
      defaultMessage: 'Replies',
      description: 'Label for replies profile stat',
    },
    relays: {
      id: 'profile.stats.relays',
      defaultMessage: 'Relays',
      description: 'Label for sats profile relays',
    },
  },
  isMuted: {
    id: 'profile.isMuted',
    defaultMessage: '{name} is muted',
    description: 'Label indicating that the profile is muted',
  },
  isFiltered: {
    id: 'profile.isFiltered',
    defaultMessage: 'This account is hidden per your filter settings.',
    description: 'Label indicating that the profile is filtered',
  },
  noNotes: {
    id: 'profile.noNotes',
    defaultMessage: '{name} hasn\'t posted any notes',
    description: 'Label indicating that the profile has no notes',
  },
  noArticles: {
    id: 'profile.noArticles',
    defaultMessage: '{name} hasn\'t published any reads',
    description: 'Label indicating that the profile has no reads',
  },
  noReplies: {
    id: 'profile.noReplies',
    defaultMessage: '{name} hasn\'t posted any replies',
    description: 'Label indicating that the profile has no replies',
  },
  noFollowers: {
    id: 'profile.noFollowers',
    defaultMessage: '{name} has no followers',
    description: 'Label indicating that the profile has no followers',
  },
  noFollows: {
    id: 'profile.noFollows',
    defaultMessage: 'No one is following {name}',
    description: 'Label indicating that the profile has no followers',
  },
  noZaps: {
    id: 'profile.noZaps',
    defaultMessage: '{name} zapped no one',
    description: 'Label indicating that the profile has no zaps',
  },
  noRelays: {
    id: 'profile.noRelays',
    defaultMessage: '{name} is on no relays',
    description: 'Label indicating that the profile has no relays',
  },
  qrModal: {
    pubkey: {
      id: 'profile.qrModal.pubkey',
      defaultMessage: 'Public key',
      description: 'Public key tab title in profile qr code modal',
    },
    ln: {
      id: 'profile.qrModal.ln',
      defaultMessage: 'Lightning address',
      description: 'Lightning address tab title in profile qr code modal',
    },

  }
};

export const search = {
  followers: {
    id: 'search.followers',
    defaultMessage: 'followers',
    description: 'Followers label for user search results',
  },
  invalid: {
    id: 'search.invalid',
    defaultMessage: 'Please enter search term.',
    description: 'Alert letting the user know that the search term is empty',
  },
  emptyQueryResult: {
    id: 'search.emptyQueryResult',
    defaultMessage: 'type to',
    description: 'Label shown is search resuls when no term is provided',
  },
  searchNostr: {
    id: 'search.searchNostr',
    defaultMessage: 'Search nostr',
    description: 'Label explaining full search action',
  },
  sidebarCaption: {
    id: 'search.sidebarCaption',
    defaultMessage: 'Users found',
    description: 'Caption for the search page sidebar showing a list of users',
  },
  feedLabel: {
    id: 'search.feedLabel',
    defaultMessage: 'Search: {query}',
    description: 'Label for a search results feed',
  },
  title: {
    id: 'search.title',
    defaultMessage: 'search for "{query}"',
    description: 'Title of the Search page',
  },
  noResults: {
    id: 'search.noResults',
    defaultMessage: 'No results found',
    description: 'Message shown when no search results were found'
  },
};

export const settings = {
  index: {
    title: {
      id: 'settings.index.title',
      defaultMessage: 'Settings',
      description: 'Title of the settings page',
    },
  },
  account: {
    title: {
      id: 'settings.account.title',
      defaultMessage: 'Account',
      description: 'Title of the account settings sub-page',
    },
    description: {
      id: 'settings.account.description',
      defaultMessage: "You can improve your account security by installing a Nostr browser extension, like {link}. By storing your Nostr private key within a browser extension, you will be able to securely sign into any Nostr web app, including Primal.",
      description: 'Warning about account security',
    },
    pubkey: {
      id: 'settings.account.pubkey',
      defaultMessage: 'Your Public Key',
      description: 'Your public key section caption',
    },
    pubkeyDesc: {
      id: 'settings.account.pubkeyDesc',
      defaultMessage: 'Anyone on Nostr can find you via your public key. Feel free to share anywhere.',
      description: 'Label describing the public key',
    },
    privkey: {
      id: 'settings.account.privkey',
      defaultMessage: 'Your Private Key',
      description: 'Your private key section caption',
    },
    privkeyDesc: {
      id: 'settings.account.privkeyDesc',
      defaultMessage: 'This key fully controls your Nostr account. Don’t share it with anyone. Only copy this key to store it securely or to login to another Nostr app.',
      description: 'Label describing the private key',
    },
  },
  appearance: {
    title: {
      id: 'settings.appearance.title',
      defaultMessage: 'Appearance',
      description: 'Title of the appearance settings sub-page',
    },
    caption: {
      id: 'settings.appearance.caption',
      defaultMessage: 'Select a theme',
      description: 'Caption for theme selection',
    },
  },
  homeFeeds: {
    title: {
      id: 'settings.homeFeeds.title',
      defaultMessage: 'Home Feeds',
      description: 'Title of the home feeds settings sub-page',
    },
    caption: {
      id: 'settings.homeFeeds.caption',
      defaultMessage: 'Edit and order your home page feeds',
      description: 'Caption for home feed ordering',
    },
  },
  readsFeeds: {
    title: {
      id: 'settings.readsFeeds.title',
      defaultMessage: 'Reads Feeds',
      description: 'Title of the reads feeds settings sub-page',
    },
    caption: {
      id: 'settings.readsFeeds.caption',
      defaultMessage: 'Edit and order your reads page feeds',
      description: 'Caption for reads feed ordering',
    },
  },
  moderation: {
    title: {
      id: 'settings.filters.title',
      defaultMessage: 'Content Moderation',
      description: 'Title of the content filtering settings sub-page',
    },
    description: {
      id: 'settings.filters.description',
      defaultMessage: 'Primal offers customizable content filtering services. In addition to your own mute list, you may subscribe to other users’ mute lists. Primal runs real time spam detection systems as well as Not-Safe-For-Work content, to which you may also subscribe.',
      description: 'Description of the content filtering settings sub-page',
    },
    shortDescription: {
      id: 'settings.filters.shortDescription',
      defaultMessage: 'Subscribe to a user’s mute list by going to their profile page:',
      description: 'Short Description of the content filtering settings sub-page',
    },
    applyFiltering: {
      id: 'settings.filters.applyFiltering',
      defaultMessage: 'Apply Content Filtering',
      description: 'Caption for home feed ordering',
    },
    searchFilteredAccount: {
      id: 'settings.filters.searchFilteredAccount',
      defaultMessage: 'Search Filtered Accounts',
      description: 'Caption for home feed ordering',
    },
    allowList: {
      id: 'settings.filters.allowList',
      defaultMessage: 'My Allowlist',
      description: 'Caption for home feed ordering',
    },
    moderationItem: {
      id: 'settings.contentModeration.item',
      defaultMessage: '{name}\'s mute list',
      description: 'Caption for my mute list algo',
    },
    searchForFiltered: {
      id: 'settings.contentModeration.searchForFiltered',
      defaultMessage: 'Search to find out if a user account is included in any of the filter lists:',
      description: 'Description for search for filtered users',
    },
    allowListsDescription: {
      id: 'settings.contentModeration.allowListsDescription',
      defaultMessage: 'Add user accounts that should be excluded from filtering:',
      description: 'Description for allow lists',
    },
    table: {
      mutelists: {
        id: 'settings.contentModeration.table.mutelists',
        defaultMessage: 'Mute Lists',
        description: 'Caption for mutelists column on moderation settings page',
      },
      algos: {
        id: 'settings.contentModeration.table.algos',
        defaultMessage: 'Algorithms',
        description: 'Caption for algorithms column on moderation settings page',
      },
      content: {
        id: 'settings.contentModeration.table.content',
        defaultMessage: 'Hide Content',
        description: 'Caption for content column on moderation settings page',
      },
      trending: {
        id: 'settings.contentModeration.table.trending',
        defaultMessage: 'Don\'t Recommend',
        description: 'Caption for trending column on moderation settings page',
      },
      trendingHelp: {
        id: 'settings.contentModeration.table.trendingHelp',
        defaultMessage: 'Content won\'t be recommended in trending and most-zapped feeds',
        description: 'Help description for trending filter',
      },
      contentHelp: {
        id: 'settings.contentModeration.table.contentHelp',
        defaultMessage: 'Content will be hidden from all feeds, threads, and search results',
        description: 'Help description for content filter',
      },
    },
    algos: {
      my: {
        id: 'settings.contentModeration.algos.my',
        defaultMessage: 'My mute list',
        description: 'Caption for my mute list algo',
      },
      primal_spam: {
        id: 'settings.contentModeration.algos.spam',
        defaultMessage: 'Primal spam filter',
        description: 'Caption for spam algo',
      },
      primal_nsfw: {
        id: 'settings.contentModeration.algos.nsfw',
        defaultMessage: 'Primal NSFW filter',
        description: 'Caption for NSFW algo',
      },
    },
  },
  muted: {
    title: {
      id: 'settings.muted.title',
      defaultMessage: 'Muted Accounts',
      description: 'Title of the muted accounts settings sub-page',
    },
    empty: {
      id: 'settings.muted.empty',
      defaultMessage: 'No muted users',
      description: 'Caption indicating that there are no muted users',
    },
    emptyOther: {
      id: 'settings.muted.emptyOther',
      defaultMessage: 'This user didn\'t mute anyone or they use a non-standard mute list',
      description: 'Caption indicating that there are no muted users on someone else\'s list',
    },
  },
  nwcSettings: {
    title: {
      id: 'settings.nwcSettings.title',
      defaultMessage: 'Connected Wallets',
      description: 'Title of the nwc settings sub-page',
    },
  },
  network: {
    title: {
      id: 'settings.network.title',
      defaultMessage: 'Network',
      description: 'Title of the network settings sub-page',
    },
    relays: {
      id: 'settings.network.relays',
      defaultMessage: 'Relays',
      description: 'Title of the relays section of the network settings sub-page',
    },
    myRelays: {
      id: 'settings.network.myRelays',
      defaultMessage: 'My relays',
      description: 'Title of the my relays section of the network settings sub-page',
    },
    noMyRelays: {
      id: 'settings.networks.noMyRelays',
      defaultMessage: 'Your Nostr account doesn\'t have any relays specified, so we connected you to a default set of relays. To configure your desired set of relays, please select them from the list below.',
      description: 'Caption informing the user that he has no relays configured',
    },
    recomended: {
      id: 'settings.network.recomended',
      defaultMessage: 'Recomended Relays',
      description: 'Title of the recomended relays section of the network settings sub-page',
    },
    customRelay: {
      id: 'settings.network.customRelay',
      defaultMessage: 'Connect to relay',
      description: 'Title of the custom relays section of the network settings sub-page',
    },
    cachingService: {
      id: 'settings.network.cachingService',
      defaultMessage: 'Caching Service',
      description: 'Title of the caching service section of the network settings sub-page',
    },
    connectedCachingService: {
      id: 'settings.network.connectedCachingService',
      defaultMessage: 'Connected caching service',
      description: 'Title of the caching service section of the network settings sub-page',
    },
    alternativeCachingService: {
      id: 'settings.network.alternativeCachingService',
      defaultMessage: 'Connect to a different caching service',
      description: 'Title of the alternative caching service section of the Network settings sub-page',
    },
    proxyEvents: {
      id: 'settings.filters.proxyEvents',
      defaultMessage: 'Use Enhanced Privacy',
      description: 'Caption for option to proy event publishing through Primal',
    },
    proxyDescription: {
      id: 'settings.filters.proxyDescription',
      defaultMessage: 'When enabled, your IP address will be visible to the caching service, but not to relays. Your content will be published to your specified relays using the caching service as a proxy. ',
      description: 'Description of the proxy events settings sub-page',
    },
  },
  relays: {
    id: 'settings.relays',
    defaultMessage: 'Relays',
    description: 'Title of the relays sections of the settings sidebar',
  },
  cashingService: {
    id: 'settings.cashingService',
    defaultMessage: 'Caching services',
    description: 'Title of the caching service sections of the settings sidebar',
  },
  title: {
    id: 'settings.title',
    defaultMessage: 'Settings',
    description: 'Title of the settings page',
  },
  theme: {
    id: 'settings.sections.theme',
    defaultMessage: 'Theme',
    description: 'Title of the theme section on the settings page',
  },
  feeds: {
    id: 'settings.sections.feeds',
    defaultMessage: 'Home page feeds',
    description: 'Title of the feeds section on the settings page',
  },
  feedsAddNew: {
    id: 'settings.feedsAddNew',
    defaultMessage: 'Add New Feed',
    description: 'Label for the button for adding new feed to the feeds list',
  },
  feedsRestore: {
    id: 'settings.feedsRestore',
    defaultMessage: 'Restore Default Feeds',
    description: 'Label for the button for restoring default feeds to the feeds list',
  },
  feedsRestoreConfirm: {
    id: 'settings.feedsRestoreConfirm',
    defaultMessage: 'Restoring default feeds will erase all your custom feed settings',
    description: 'Label explaining the impact of restoring default feeds',
  },
  zapsRestoreConfirm: {
    id: 'settings.zapsRestoreConfirm',
    defaultMessage: 'This action will restore all your zap settings to their default values',
    description: 'Label explaining the impact of restoring default zaps',
  },
  zapEmojiFilterTitle: {
    id: 'settings.zapEmojiFilterTitle',
    defaultMessage: 'Select an emoji',
    description: 'Title for the select emoji modal',
  },
  zapEmojiFilterPlaceholder: {
    id: 'settings.zapEmojiFilterPlaceholder',
    defaultMessage: 'Search...',
    description: 'Placeholder for the emoji modal filter',
  },
  feedLatest: {
    id: 'feeds.feedLatest',
    defaultMessage: 'Latest',
    description: 'Label for the `latest;following` (active user\'s) feed',
  },
  feedLatestWithReplies: {
    id: 'feeds.feedLatestWithReplies',
    defaultMessage: 'Latest with Replies',
    description: 'Label for the `latest;following` with `include_replies` flag (active user\'s) feed',
  },
  zaps: {
    id: 'settings.sections.zaps',
    defaultMessage: 'Zaps',
    description: 'Title of the zaps section on the settings page',
  },
  devTools: {
    id: 'settings.sections.devTools',
    defaultMessage: 'Dev Tools',
    description: 'Title of the dev tools section on the settings page',
  },
  notifications: {
    title: {
      id: 'pages.settings.sections.notifications',
      defaultMessage: 'Notifications',
      description: 'Title of the notifications section on the settings page',
    },
    core: {
      id: 'settings.sections.notifications.core',
      defaultMessage: 'Core notifications:',
      description: 'Title of the notification settings sub-section for core notifications',
    },
    yourMentions: {
      id: 'settings.sections.notifications.yourMentions',
      defaultMessage: 'A note you were mentioned in was:',
      description: 'Title of the notification settings sub-section for notes you were mentioned in',
    },
    yourPostMentions: {
      id: 'settings.sections.notifications.yourPostMentions',
      defaultMessage: 'A note your note was mentioned in was:',
      description: 'Title of the notification settings sub-section for notes your note was mentioned in',
    },
  },
  profile: {
    title: {
      id: 'pages.settings.profile.title',
      defaultMessage: 'Edit Profile',
      description: 'Title of the edit profile page',
    },
    uploadAvatar: {
      id: 'pages.settings.profile.uploadAvatar',
      defaultMessage: 'Upload Avatar',
      description: 'Label for avatar upload on edit profile page',
    },
    uploadBanner: {
      id: 'pages.settings.profile.uploadBanner',
      defaultMessage: 'Upload Banner',
      description: 'Label for banner upload on edit profile page',
    },
    displayName: {
      label: {
        id: 'pages.settings.profile.displayName.label',
        defaultMessage: 'Display Name',
        description: 'Label for display name input on edit profile page',
      },
      help: {
        id: 'pages.settings.profile.displayName.help',
        defaultMessage: 'Pick a longer display name (e. g. “Satoshi Nakamoto”)',
        description: 'Help for displayName input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.displayName.placeholder',
        defaultMessage: 'Enter display name',
        description: 'Placeholder for display name input on edit profile page',
      },
    },
    required: {
      id: 'pages.settings.profile.reqired',
      defaultMessage: 'required',
      description: 'Label indicating an input is required',
    },
    name: {
      label: {
        id: 'pages.settings.profile.name.label',
        defaultMessage: 'Username',
        description: 'Label for name input on edit profile page',
      },
      help: {
        id: 'pages.settings.profile.name.help',
        defaultMessage: 'Pick a short user handle (e. g. “satoshi”)',
        description: 'Help for name input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.name.placeholder',
        defaultMessage: 'Enter username',
        description: 'Placeholder for name input on edit profile page',
      },
      error: {
        id: 'pages.settings.profile.name.error',
        defaultMessage: 'Spaces and special characters are not allowed in the username',
        description: 'Error label for name input on edit profile page',
      },
      formError: {
        id: 'pages.settings.profile.name.formError',
        defaultMessage: 'Username is not valid',
        description: 'Error label for invalid form on edit profile page',
      },
    },
    website: {
      label: {
        id: 'pages.settings.profile.website.label',
        defaultMessage: 'Website',
        description: 'Label for website input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.website.placeholder',
        defaultMessage: 'https://www.mysite.com',
        description: 'Placeholder for website input on edit profile page',
      },
    },
    about: {
      label: {
        id: 'pages.settings.profile.about.label',
        defaultMessage: 'About Me',
        description: 'Label for about input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.about.placeholder',
        defaultMessage: 'Say something about yourself',
        description: 'Placeholder for about input on edit profile page',
      },
    },
    lud16: {
      label: {
        id: 'pages.settings.profile.lud16.label',
        defaultMessage: 'Bitcoin Lightning Address',
        description: 'Label for lud16 input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.lud16.placeholder',
        defaultMessage: 'Enter your LN address',
        description: 'Placeholder for lud16 input on edit profile page',
      },
    },
    nip05: {
      label: {
        id: 'pages.settings.profile.nip05.label',
        defaultMessage: 'Verified Nostr Address (NIP-05)',
        description: 'Label for nip-05 input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.nip05.placeholder',
        defaultMessage: 'Enter your NIP-05 Verified Nostr ID',
        description: 'Placeholder for nip-05 input on edit profile page',
      },
    },
    picture: {
      label: {
        id: 'pages.settings.profile.picture.label',
        defaultMessage: 'Avatar Image Url',
        description: 'Label for avatar input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.picture.placeholder',
        defaultMessage: 'Enter your avatar url',
        description: 'Placeholder for avatar input on edit profile page',
      },
    },
    banner: {
      label: {
        id: 'pages.settings.profile.banner.label',
        defaultMessage: 'Banner Image Url',
        description: 'Label for banner input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.banner.placeholder',
        defaultMessage: 'Enter your banner url',
        description: 'Placeholder for banner input on edit profile page',
      },
    },
  },
};

export const scopeDescriptors: Record<string, ScopeDescriptor> = {
  follows: {
    caption: {
      id: 'explore.scopes.follows.caption',
      defaultMessage: 'Follows',
      description: 'Caption for the follows scope',
    },
    label: {
      id: 'explore.scopes.follows.label',
      defaultMessage: 'my follows',
      description: 'Label for the follows scope',
    },
    description: {
      id: 'explore.scopes.follows.description',
      defaultMessage: 'accounts you follow',
      description: 'Description of the follows scope description',
    },
  },
  tribe: {
    caption: {
      id: 'explore.scopes.tribe.caption',
      defaultMessage: 'Tribe',
      description: 'Caption for the tribe scope',
    },
    label: {
      id: 'explore.scopes.tribe.label',
      defaultMessage: 'my tribe',
      description: 'Label for the tribe scope',
    },
    description: {
      id: 'explore.scopes.tribe.description',
      defaultMessage: 'accounts you follow <div>+ your followers</div>',
      description: 'Description of the tribe scope description',
    },
  },
  network: {
    caption: {
      id: 'explore.scopes.network.caption',
      defaultMessage: 'Network',
      description: 'Caption for the network scope',
    },
    label: {
      id: 'explore.scopes.network.label',
      defaultMessage: 'my network',
      description: 'Label for the network scope',
    },
    description: {
      id: 'explore.scopes.network.description',
      defaultMessage: 'accounts you follow <div>+ everyone they follow</div>',
      description: 'Description of the network scope description',
    },
  },
  global: {
    caption: {
      id: 'explore.scopes.global.caption',
      defaultMessage: 'Global',
      description: 'Caption for the global scope',
    },
    label: {
      id: 'explore.scopes.global.label',
      defaultMessage: 'global',
      description: 'Label for the global scope',
    },
    description: {
      id: 'explore.scopes.global.description',
      defaultMessage: 'all accounts on nostr',
      description: 'Description of the global scope description',
    },
  },
};

export const timeframeDescriptors: Record<string, MessageDescriptor> = {
  latest: {
    id: 'explore.timeframes.latest.caption',
    defaultMessage: 'latest',
    description: 'Caption for the latest timeframe',
  },
  trending: {
    id: 'explore.timeframes.trending.caption',
    defaultMessage: 'trending',
    description: 'Caption for the trending timeframe',
  },
  popular: {
    id: 'explore.timeframes.popular.caption',
    defaultMessage: 'popular',
    description: 'Caption for the popular timeframe',
  },
  mostzapped: {
    id: 'explore.timeframes.mostzapped.caption',
    defaultMessage: 'zapped',
    description: 'Caption for the mostzapped timeframe',
  },
};

export const toastZapFail = {
  id: 'toast.zapFail',
  defaultMessage: 'We were unable to send this Zap',
  description: 'Toast message indicating failed zap',
};


export const toastZapProfile = {
  id: 'toast.zapProfile',
  defaultMessage: '{name} zapped successfully',
  description: 'Toast message indicating successful zap',
};

export const thread = {
  sidebar: {
    id: 'thread.sidebar',
    defaultMessage: 'Replying to this Note',
    description: 'Title of the Thread page sidebar',
  },
  sidebarMentions: {
    id: 'thread.sidebarMentions',
    defaultMessage: 'People in this Note',
    description: 'Title of the Thread page sidebar',
  },
  pageTitle: {
    id: 'thread.page.title',
    defaultMessage: 'Note by {name}',
    description: 'Title of the Thread page sidebar',
  },
};

export const toast = {
  addFeedToHomeSuccess: {
    id: 'toasts.addFeedToHome.success',
    defaultMessage: '"{name}" has been added to your home page',
    description: 'Toast message confirming successfull adding of the feed to home to the list of available feeds',
  },
  removeFeedFromHomeSuccess: {
    id: 'toasts.removeFeedToHome.success',
    defaultMessage: '"{name}" has been removed from your home page',
    description: 'Toast message confirming successfull removal of the feed from home\'s list of available feeds',
  },
  fileTypeUpsupported: {
    id: 'toast.unsupportedFileType',
    defaultMessage: 'You can only upload images and videos. This file type is not supported.',
    description: 'Feedback when user tries to upload an unsupported file type',
  },
  publishNoteSuccess: {
    id: 'toast.publishNoteSuccess',
    defaultMessage: 'Note posted successfully',
    description: 'Toast message confirming successfull publication of the note',
  },
  publishNoteTimeout: {
    id: 'toast.publishNoteTimeout',
    defaultMessage: 'No relay confirmed reception of your note after 8 seconds',
    description: 'Toast message indicating that no relay confirmed note reception',
  },
  publishNoteFail: {
    id: 'toast.publishNoteFail',
    defaultMessage: 'Failed to publish note',
    description: 'Toast message indicating that note publishing has failed',
  },
  noRelays: {
    id: 'toast.noRelays',
    defaultMessage: 'You need to declare at least one relay to perform this action',
    description: 'Toast message indicating user has no relays configured',
  },
  noRelaysConnected: {
    id: 'toast.noRelaysConnected',
    defaultMessage: '"We are trying to connect to your relays. Please try again in a few moments.',
    description: 'Toast message indicating user is not connected to aany relay',
  },
  noExtension: {
    id: 'toast.noExtension',
    defaultMessage: 'Nostr extension is required to send events',
    description: 'Toast message indicating no extension was found',
  },
  noteNostrLinkCoppied: {
    id: 'toast.noteNostrLinkCoppied',
    defaultMessage: 'Note nostr link copied',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalLinkCoppied: {
    id: 'toast.notePrimalLinkCoppied',
    defaultMessage: 'Note link copied',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalTextCoppied: {
    id: 'toast.notePrimalTextCoppied',
    defaultMessage: 'Note text copied',
    description: 'Confirmation message that the note\'s text has been copied',
  },
  noteIdCoppied: {
    id: 'toast.noteIdCoppied',
    defaultMessage: 'Note id copied',
    description: 'Confirmation message that the note\'s id has been copied',
  },
  noteRawDataCoppied: {
    id: 'toast.noteRawDataCoppied',
    defaultMessage: 'Note raw data copied',
    description: 'Confirmation message that the note\'s raw data has been copied',
  },
  noteAuthorNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'Note author npub copied',
    description: 'Confirmation message that the note\'s author npub has been copied',
  },
  profileNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'User npub copied',
    description: 'Confirmation message that the user\'s npub has been copied',
  },
  noteBroadcastSuccess: {
    id: 'toast.noteBroadcastSuccess',
    defaultMessage: 'Note has been broadcasted to your relays',
    description: 'Confirmation message that the note has been broadcasted',
  },
  noteBroadcastFail: {
    id: 'toast.noteBroadcastFail',
    defaultMessage: 'We were unable to broadcast this note',
    description: 'Failure message that the note has not been broadcasted',
  },
  repostSuccess: {
    id: 'toast.repostSuccess',
    defaultMessage: 'Reposted successfully',
    description: 'Toast message indicating successfull repost',
  },
  repostFailed: {
    id: 'toast.repostFailed',
    defaultMessage: 'Failed to repost',
    description: 'Toast message indicating failed repost',
  },
  noteAuthorReported: {
    id: 'toast.noteAuthorReported',
    defaultMessage: 'User {name} reported',
    description: 'Toast message indicating successfull user report',
  },
  zapAsGuest: {
    id: 'toast.zapAsGuest',
    defaultMessage: 'You must be logged-in to perform a zap',
    description: 'Toast message indicating user must be logged-in to perform a zap',
  },
  zapUnavailable: {
    id: 'toast.zapUnavailable',
    defaultMessage: 'Author of this note cannot be zapped',
    description: 'Toast message indicating user cannot receieve a zap',
  },
  zapDVMUnavailable: {
    id: 'toast.zapDVMUnavailable',
    defaultMessage: 'Author of this feed cannot be zapped',
    description: 'Toast message indicating user cannot receieve a zap',
  },
  updateProfileSuccess: {
    id: 'toast.updateProfileSuccess',
    defaultMessage: 'Profile updated successfully',
    description: 'Toast message indicating that profile was successfully updated',
  },
  updateProfileFail: {
    id: 'toast.updateProfileFail',
    defaultMessage: 'Failed to update profile, please try again',
    description: 'Toast message indicating that profile has failed to updated',
  },
};

export const zapCustomOption = {
  id: 'zap.custom.option',
  defaultMessage: 'Zap {user} ',
  description: 'Caption for custom zap amount modal',
};

export const zapCustomAmount = {
  id: 'zap.custom.amount',
  defaultMessage: `Custom amount:`,
  description: 'Caption for custom zap amount input',
};

export const errors = {
  invalidRelayUrl: {
    id: 'placeholders.invalidRelayUrl',
    defaultMessage: 'Invalid url',
    description: 'Error text for invalid url',
  },
};

export const unknown = {
  id: 'unknown',
  defaultMessage: 'UNKNOWN',
  description: 'Error text for Unknown',
};

export const emojiGroups = {
  preset: {
    id: 'emoji.recent',
    defaultMessage: 'Recently Used',
    description: 'Recently used emoji group title',
  },
  face: {
    id: 'emoji.face',
    defaultMessage: 'Faces',
    description: 'Faces emoji group title',
  },
};

export const upload = {
  fail: {
    id: 'upload.fail',
    defaultMessage: 'Failed to upload file {file}',
    description: 'Error feedback when upload fails',
  },
  fileTooBigRegular: {
    id: 'upload.fileTooBigRegular',
    defaultMessage: 'File too big. Upload limit is 100MB.',
    description: 'Error feedback when file is too big for regular users',
  },
  fileTooBigPremium: {
    id: 'upload.fileTooBigPremium',
    defaultMessage: 'File too big. Upload limit is 1GB.',
    description: 'Error feedback when file is too big for premiumUsers',
  },
};

export const landing = {
  tagline: {
    id: 'landing.tagline',
    defaultMessage: 'The Social Bitcoin Wallet',
    description: 'Landing page tagline',
  },
  description: {
    id: 'landing.description',
    defaultMessage: 'Open protocols for money and speech are going to change everything. Join the revolution.',
    description: 'Landing page description',
  },
  browserOption: {
    id: 'landing.browserOption',
    defaultMessage: 'Continue in browser',
    description: 'Landing page browser option',
  },
};

export const forgotPin = {
  title: {
    id: 'forgotPin.title',
    defaultMessage: 'This action will erase you key',
    description: 'Forgot pin modal title',
  },
  description: {
    id: 'forgotPin.description',
    defaultMessage: 'You will still be able to browse Nostr through Primal but you will not be able to take any actions (post notes, likes,...) until you re-login with your private key. Are you sure you wish to continue?',
    description: 'Explanation of what happens when pin is erased',
  },
  confirm: {
    id: 'forgotPin.confirm',
    defaultMessage: 'Yes, continue',
    description: 'Confirm forgot pin action',
  },
  abort: {
    id: 'forgotPin.abort',
    defaultMessage: 'Cancel',
    description: 'Abort forgot pin action',
  },
};

export const followWarning = {
  title: {
    id: 'followWarning.title',
    defaultMessage: 'This action may result in an error',
    description: 'Follow error modal title',
  },
  description: {
    id: 'followWarning.description',
    defaultMessage: 'If you continue, you will end up following just one nostr account. Are you sure you want to continue?',
    description: 'Explanation of what happens when follow error occurs',
  },
  confirm: {
    id: 'followWarning.confirm',
    defaultMessage: 'Yes, continue',
    description: 'Confirm forgot pin action',
  },
  abort: {
    id: 'followWarning.abort',
    defaultMessage: 'Abort',
    description: 'Abort forgot pin action',
  },
};

export const reads = {
  pageTitle: {
    id: 'reads.pageTitle',
    defaultMessage: 'Reads',
    description: 'Reads page title',
  },
};

export const bookmarks = {
  pageTitle: {
    id: 'bookmarks.pageTitle',
    defaultMessage: 'Bookmarks',
    description: 'Bookmarks page title',
  },
  noBookmarks: {
    id: 'bookmarks.noBookmarks',
    defaultMessage: 'You don\'t have any bookmarks',
    description: 'No bookmarks caption',
  },
  confirm: {
    title: {
      id: 'bookmarks.confirm.title',
      defaultMessage: 'Saving First Bookmark',
      description: 'Follow error modal title',
    },
    description: {
      id: 'bookmarks.confirm.description',
      defaultMessage: 'You are about to save your first public bookmark. These bookmarks can be seen by other nostr users. Do you wish to continue?',
      description: 'Explanation of what happens when bookmark error occurs',
    },
    confirm: {
      id: 'bookmarks.confirm.confirm',
      defaultMessage: 'Save Bookmark',
      description: 'Confirm forgot pin action',
    },
    abort: {
      id: 'bookmarks.confirm.abort',
      defaultMessage: 'Cancel',
      description: 'Abort forgot pin action',
    },
    titleZero: {
      id: 'bookmarks.confirm.title',
      defaultMessage: 'Removing Last Bookmark',
      description: 'Follow error modal title',
    },
    descriptionZero: {
      id: 'bookmarks.confirm.description',
      defaultMessage: 'You are about to remove your last public bookmark. Do you wish to continue?',
      description: 'Explanation of what happens when bookmark error occurs',
    },
    confirmZero: {
      id: 'bookmarks.confirm.confirm',
      defaultMessage: 'Remove Bookmark',
      description: 'Confirm forgot pin action',
    },
    abortZero: {
      id: 'bookmarks.confirm.abort',
      defaultMessage: 'Cancel',
      description: 'Abort forgot pin action',
    },
  }
}

export const lnInvoice = {
  pay: {
    id: 'lnInvoice.pay',
    defaultMessage: 'Pay',
    description: 'Pay invoice action',
  },
  title: {
    id: 'lnInvoice.title',
    defaultMessage: 'Lightning Invoice',
    description: 'Lightning Invoice title',
  },
  expired: {
    id: 'lnInvoice.expired',
    defaultMessage: 'Expired: {date} ago',
    description: 'Expired time',
  },
  expires: {
    id: 'lnInvoice.expires',
    defaultMessage: 'Expires: in {date}',
    description: 'Expires time',
  },
  confirm: {
    title: {
      id: 'lnInvoice.confirm.title',
      defaultMessage: 'Are you sure?',
      description: 'Lightning invoice pay confirmation',
    },
    description: {
      id: 'lnInvoice.confirm.description',
      defaultMessage: 'Pay {amount}',
      description: 'Lightning Invoice confirm description',
    },
    confirmLabel: {
      id: 'lnInvoice.confirm.confirmLabel',
      defaultMessage: 'Yes, pay',
      description: 'Lightning Invoice confirm button label',
    },
    abortLabel: {
      id: 'lnInvoice.confirm.abortLabel',
      defaultMessage: 'Cancel',
      description: 'Lightning Invoice confirm button label',
    },
  },

};

export const cashuInvoice = {
  redeem: {
    id: 'cashuInvoice.redeem',
    defaultMessage: 'Reedem',
    description: 'Reedem ecash action',
  },
  pending: {
    id: 'cashuInvoice.pending',
    defaultMessage: 'Pending',
    description: 'Pending ecash',
  },
  spent: {
    id: 'cashuInvoice.spent',
    defaultMessage: 'Spent',
    description: 'Spent ecash',
  },
  title: {
    id: 'cashuInvoice.title',
    defaultMessage: 'Cashu Ecash',
    description: 'Cashu Ecash title',
  },
  mint: {
    id: 'cashuInvoice.mint',
    defaultMessage: 'Mint: {url}',
    description: 'Mint url',
  },
  confirm: {
    title: {
      id: 'cashuInvoice.confirm.title',
      defaultMessage: 'Are you sure?',
      description: 'Cashu invoice pay confirmation',
    },
    description: {
      id: 'cashuInvoice.confirm.description',
      defaultMessage: 'Redeem {amount}',
      description: 'Cashu Invoice confirm description',
    },
    confirmLabel: {
      id: 'cashuInvoice.confirm.confirmLabel',
      defaultMessage: 'Yes, redeem',
      description: 'Cashu Invoice confirm button label',
    },
    abortLabel: {
      id: 'cashuInvoice.confirm.abortLabel',
      defaultMessage: 'Cancel',
      description: 'Cashu Invoice confirm button label',
    },
  },

};

export const reactionsModal = {
  tabs: {
    likes: {
      id: 'reactionsModal.tabs.likes',
      defaultMessage: 'Likes ({count})',
      description: 'Likes tab label in reactions modal',
    },
    zaps: {
      id: 'reactionsModal.tabs.zaps',
      defaultMessage: 'Zaps ({count})',
      description: 'Zaps tab label in reactions modal',
    },
    reposts: {
      id: 'reactionsModal.tabs.reposts',
      defaultMessage: 'Reposts ({count})',
      description: 'Reposts tab label in reactions modal',
    },
    quotes: {
      id: 'reactionsModal.tabs.quotes',
      defaultMessage: 'Quotes ({count})',
      description: 'Quotes tab label in reactions modal',
    },
  },
};

export const premium = {
  labels: {
    foreverPremium: {
      id: 'pages.premium.labes.foreverPremium',
      defaultMessage: 'Forever Premium',
      description: 'Forever Premium perk title',
    },
    foreverPremiumDescription: {
      id: 'pages.premium.labes.foreverPremiumDescription',
      defaultMessage: 'Premium subscription never expires for legends.',
      description: 'Forever Premium perk description',
    },
    privateBetaBuilds: {
      id: 'pages.premium.labes.privateBetaBuilds',
      defaultMessage: 'Private Beta Builds',
      description: 'Private Beta Builds perk title',
    },
    privateBetaBuildsDescription: {
      id: 'pages.premium.labes.privateBetaBuildsDescription',
      defaultMessage: 'Get access to new features before they are public.',
      description: 'Private Beta perk description',
    },
    moreMediaSpace: {
      id: 'pages.premium.labes.moreMediaSpace',
      defaultMessage: 'Way More Storage',
      description: 'More Media perk title',
    },
    moreMediaSpaceDescription: {
      id: 'pages.premium.labes.moreMediaSpaceDescription',
      defaultMessage: 'Get 100GB of Primal Premium media storage.',
      description: 'More Media perk description',
    },
    customLegendProfile: {
      id: 'pages.premium.labes.customLegendProfile',
      defaultMessage: 'Legendary Custom Profile',
      description: 'Legendary Custom Profile perk title',
    },
    customLegendDescription: {
      id: 'pages.premium.labes.customLegendDescription',
      defaultMessage: 'Option to pick the color of your verified badge and set the glow around your avatar',
      description: 'Legendary Custom Profile perk description',
    },
    legendPageCaption: {
      id: 'pages.premium.labes.legendPageCaption',
      defaultMessage: 'Donate $1000 or more to gain:',
      description: 'Legend page caption',
    },
    legendPageExplanation: {
      id: 'pages.premium.labes.legendPageExplanation',
      defaultMessage: 'The Legend tier was created to recognize users who have made a significant contribution to Primal.',
      description: 'Legend page explanation',
    },
    supportFirstLine: {
      id: 'pages.premium.labes.supportFirstLine',
      defaultMessage: 'Are you enjoying Primal?',
      description: 'Support label first line',
    },
    supportSecondLine: {
      id: 'pages.premium.labes.supportSecondLine',
      defaultMessage: 'if so, see how you can ',
      description: 'Support label second line',
    },
    supportCaption: {
      id: 'pages.premium.labes.supportCaption',
      defaultMessage: 'Be a part of the Nostr revolution and help us continue building for this ecosystem.',
      description: 'Support page caption',
    },
    leaveStars: {
      id: 'pages.premium.labes.leaveStars',
      defaultMessage: 'Leave a 5 Star Review',
      description: 'Support page 5 star review caption',
    },
    leaveStarsDescription: {
      id: 'pages.premium.labes.leaveStarsDescription',
      defaultMessage: 'App Store reviews really help improve the visibility of Nostr apps at this early stage.',
      description: 'Support page 5 star review description',
    },
    extendSubscription: {
      id: 'pages.premium.labes.extendSubscription',
      defaultMessage: 'Extend Subscription',
      description: 'Support page extend subscription caption',
    },
    extendSubscriptionDescription: {
      id: 'pages.premium.labes.extendSubscriptionDescription',
      defaultMessage: 'Extend your existing subscription to gain peace of mind and help fund Primal.',
      description: 'Support page extend subscription description',
    },
    becomeLegend: {
      id: 'pages.premium.labes.becomeLegend',
      defaultMessage: 'Become a Legend',
      description: 'Support page become legend caption',
    },
    becomeLegendDescription: {
      id: 'pages.premium.labes.becomeLegendDescription',
      defaultMessage: 'Donate $1000 or more to gain permanent membership and exclusive perks!',
      description: 'Support page become legend description',
    },
  },
  actions: {
    payNow: {
      id: 'pages.premium.actions.payNow',
      defaultMessage: 'Pay Now',
      description: 'Action to pay now',
    },
    becomeLegend: {
      id: 'pages.premium.actions.becomeLegend',
      defaultMessage: 'Become a Legend Now',
      description: 'Action that takes user to the Become a Legend page',
    },
    getIOS: {
      id: 'pages.premium.actions.getIOS',
      defaultMessage: 'Go to iOS App',
      description: 'Action that takes user to the iOS APP page',
    },
    getAndroid: {
      id: 'pages.premium.actions.getAndroid',
      defaultMessage: 'Go to Android App',
      description: 'Action that takes user to the Android App page',
    },
    support: {
      id: 'pages.premium.actions.support',
      defaultMessage: 'support us',
      description: 'Action that takes user to the support page',
    },
    start: {
      id: 'pages.premium.actions.start',
      defaultMessage: 'Find Primal Name',
      description: 'Find primal name action on the premium page',
    },
    back: {
      id: 'pages.premium.actions.back',
      defaultMessage: 'Back',
      description: 'To the previous step on the premium page',
    },
    next: {
      id: 'pages.premium.actions.next',
      defaultMessage: 'Next',
      description: 'To the next step on the premium page',
    },
    subscribe: {
      id: 'pages.premium.actions.subscribe',
      defaultMessage: 'Subscribe',
      description: 'Subscribe action on the premium page',
    },
    done: {
      id: 'pages.premium.actions.done',
      defaultMessage: 'Done',
      description: 'Done action on the premium page',
    },
    rename: {
      id: 'pages.premium.actions.rename',
      defaultMessage: 'Rename',
      description: 'To the rename step on the premium page',
    },
    changeName: {
      id: 'pages.premium.actions.changeName',
      defaultMessage: 'Change Your Primal Name',
      description: 'Change Primal name action on the premium page',
    },
    extendPlan: {
      id: 'pages.premium.actions.extendPlan',
      defaultMessage: 'Extend Your Subscription',
      description: 'Extend your subscription action on the premium page',
    },
    renewPlan: {
      id: 'pages.premium.actions.renewPlan',
      defaultMessage: 'Renew Your Subscription',
      description: 'Extend your subscription action on the premium page',
    },
    managePremium: {
      id: 'pages.premium.actions.managePremium',
      defaultMessage: 'Manage Premium',
      description: 'Manage your Premium Account',
    },
  },
  title: {
    general: {
      id: 'pages.premium.title',
      defaultMessage: 'Primal Premium',
      description: 'Title of the premium page',
    },
    name: {
      id: 'pages.premium.name',
      defaultMessage: 'Choose a primal name',
      description: 'Title of the premium find name page',
    },
    subscription: {
      id: 'pages.premium.subscription',
      defaultMessage: 'Congrats!',
      description: 'Title of the premium subscription page',
    },
    subscriptionSubtitle: {
      id: 'pages.premium.subscriptionSubtitle',
      defaultMessage: 'Your Primal Name is available',
      description: 'Subtitle of the premium subscription page',
    },
    rename: {
      id: 'pages.premium.rename',
      defaultMessage: 'Change your primal name',
      description: 'Title of the premium rename page',
    },
    support: {
      id: 'pages.premium.support',
      defaultMessage: 'Support Primal',
      description: 'Title of the premium support page',
    },
    premiums: {
      id: 'pages.premium.premiums',
      defaultMessage: 'Premium Users',
      description: 'Title of the premium leaderboards page',
    },
    legends: {
      id: 'pages.premium.legends',
      defaultMessage: 'Primal Legends',
      description: 'Title of the legends leaderboards page',
    },
    legend: {
      id: 'pages.premium.legend',
      defaultMessage: 'Become a Primal Legend',
      description: 'Title of the premium legend page',
    },
    legendShort: {
      id: 'pages.premium.legendShort',
      defaultMessage: 'Primal Legend',
      description: 'Short title of the premium legend page',
    },
    relay: {
      id: 'pages.premium.relay',
      defaultMessage: 'Primal Relay',
      description: 'Title of the premium relay page',
    },
    media: {
      id: 'pages.premium.media',
      defaultMessage: 'Media Managment',
      description: 'Title of the premium media managment page',
    },
    contacts: {
      id: 'pages.premium.contacts',
      defaultMessage: 'Recover Follow List',
      description: 'Title of the premium recover contacts page',
    },
    content: {
      id: 'pages.premium.content',
      defaultMessage: 'Content Backup',
      description: 'Title of the premium content backup page',
    },
    og: {
      id: 'pages.premium.og',
      defaultMessage: 'Primal OG',
      description: 'Title of the Primal OG page',
    },
    ogLegend: {
      id: 'pages.premium.ogLegend',
      defaultMessage: 'Primal Legend',
      description: 'Title of the Primal Legend page',
    },
  },
  subOptions: {
    prices: {
      m7: {
        id: 'pages.premium.subOption.m7',
        defaultMessage: '$7/month',
        description: '$7 per month',
      },
      m6: {
        id: 'pages.premium.subOption.m6',
        defaultMessage: '$6/month',
        description: '$6 per month',
      },
    },
    durations: {
      m3: {
        id: 'pages.premium.duration.m3',
        defaultMessage: '3 months',
        description: '3 month duration',
      },
      m12: {
        id: 'pages.premium.duration.m12',
        defaultMessage: '12 months',
        description: '12 month duration',
      },
    },
    success: {
      caption: {
        id: 'pages.premium.success.caption',
        defaultMessage: 'Success!',
        description: 'Payment success caption',
      },
      m3: {
        id: 'pages.premium.success.m3',
        defaultMessage: 'You subscribed to Primal Premium for 3 months.',
        description: 'Payment success description for 3 month plan',
      },
      m12: {
        id: 'pages.premium.success.m12',
        defaultMessage: 'You subscribed to Primal Premium for 12 months.',
        description: 'Payment success description for 12 month plan',
      },
      legend: {
        id: 'pages.premium.success.legend',
        defaultMessage: 'You are now a Primal Legend.',
        description: 'Payment success description for legends',
      },
    }
  },
  errors: {
    nameTooShort: {
      id: 'pages.premium.error.nameTooShort',
      defaultMessage: 'Name needs to be at least 3 characters long',
      description: 'Name is too short error',
    },
    nameUnavailable: {
      id: 'pages.premium.error.nameUnavailable',
      defaultMessage: 'Sorry, that name is currently unavailable',
      description: 'Name is unavailable error',
    },
    nameNotChanged: {
      id: 'pages.premium.error.nameNotChanged',
      defaultMessage: 'Failed to change name',
      description: 'Name is unavailable error',
    },
  }
};
