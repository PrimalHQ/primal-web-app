import { MessageDescriptor } from "@cookbook/solid-intl";
import { NotificationType } from "./constants";
import { ScopeDescriptor } from "./types/primal";


export const account = {
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
  needToLogin: {
    id: 'account.needToLogin',
    defaultMessage: 'You need to be signed in to perform this action',
    description: 'Message to user that an action cannot be preformed without a public key',
  },
};

export const actions = {
  cancel: {
    id: 'actions.cancel',
    defaultMessage: 'cancel',
    description: 'Cancel action, button label',
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
    defaultMessage: 'post',
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
    reportUser: {
      id: 'actions.profileContext.reportUser',
      defaultMessage: 'Report user',
      description: 'Label for reporting user from profile context menu',
    },
  },
  noteContext: {
    zap: {
      id: 'actions.noteContext.zapNote',
      defaultMessage: 'Zap',
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
  callToActionTitle: {
    id: 'downloads.ctaTitle',
    defaultMessage: 'Primal Mobile Apps are Here!',
    description: 'Title for the downloads\' page call-to-action',
  },
  callToActionDescription: {
    id: 'downloads.ctaDescription',
    defaultMessage: 'The iOS app is in public TestFlight and ready to be used as a daily driver. The Android app is in alpha, but developing quickly!',
    description: 'Description for the downloads\' page call-to-action',
  },
  callToActionIOSTitle: {
    id: 'downloads.ctaAndroidTitle',
    defaultMessage: 'Primal iOS TestFlight',
    description: 'Title for the iOS downloads\' page call-to-action',
  },
  callToActionIOSDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'The app features easy onboarding, fast & snappy UI, ability to explore Nostr, and create & manage custom feeds',
    description: 'Description for the iOS downloads\' page call-to-action',
  },
  callToActionAndroidTitle: {
    id: 'downloads.ctaAndroidTitle',
    defaultMessage: 'Primal Android Beta',
    description: 'Title for the Android downloads\' page call-to-action',
  },
  callToActionAndroidDescription: {
    id: 'downloads.ctaAndroidDescription',
    defaultMessage: 'The app features easy onboarding, fast & snappy UI, ability to explore Nostr, and create & manage custom feeds',
    description: 'Description for the Android downloads\' page call-to-action',
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
    description: 'Default label form positive response to the confirmation dialog',
  },
  abort: {
    id: 'confirm.no',
    defaultMessage: 'No',
    description: 'Default label form negative response to the confirmation dialog',
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
    defaultMessage: 'explore nostr',
    description: 'Generic caption for the explore page',
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
  id: 'feedName',
  defaultMessage: '{name}\'s feed',
  description: 'Generic name for a feed created from a profile',
};

export const feedNewPosts = {
  id: 'feed.newPosts',
  defaultMessage: `{number, plural,
    =0 {}
    one {# new post}
    =100 {99+ new posts}
    other {# new posts}}`,
  description: 'Label for a button to load new posts',
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
    defaultMessage: '\[post by {name}\]',
    description: 'Label indicating that a note has been metioned in the small note display'
  },
  reposted: {
    id: 'note.reposted',
    defaultMessage: 'Reposted',
    description: 'Label indicating that the note is a repost',
  },
};

export const notificationTypeTranslations: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'followed you',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'unfollowed you',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'zapped your post',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'liked your post',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'reposted your post',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'replied to your post',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'mentioned you in a post',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'mentioned your post',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'zapped a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'liked a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'reposted a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a post you were mentioned in',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'zapped a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'liked a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'reposted a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a post your post was mentioned in',
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
      one {mention of your post}
      other {mentions of your posts}}`,
    description: 'Sidebar mentions your post stats description on the notification page',
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
};

export const placeholders = {
  comingSoon: {
    id: 'placeholders.comingSoon',
    defaultMessage: 'Coming soon',
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
    defaultMessage: 'say something on nostr...',
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
    defaultMessage: 'search',
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
  sidebarCaption: {
    id: 'profile.sidebar.caption',
    defaultMessage: 'Popular posts',
    description: 'Caption for the profile page sidebar showing a list of trending notes by the profile',
  },
  sidebarNoNotes: {
    id: 'profile.sidebar.noNotes',
    defaultMessage: 'No trending posts',
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
    notes: {
      id: 'profile.stats.notes',
      defaultMessage: 'Posts',
      description: 'Label for notes profile stat',
    },
  },
  isMuted: {
    id: 'profile.isMuted',
    defaultMessage: '{name} is muted',
    description: 'Label indicating that the profile is muted',
  },
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
    defaultMessage: 'search nostr',
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
      defaultMessage: 'My Relays',
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
  },
  relays: {
    id: 'settings.relays',
    defaultMessage: 'Relays',
    description: 'Title of the relays sections of the settings sidebar',
  },
  cashingService: {
    id: 'settings.cashingService',
    defaultMessage: 'Caching Service',
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
  feedsRestore: {
    id: 'settings.feedsRestore',
    defaultMessage: 'restore defaults',
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
  feedLatest: {
    id: 'feeds.latestFollowing',
    defaultMessage: 'Latest',
    description: 'Label for the `latest;following` (active user\'s) feed',
  },
  zaps: {
    id: 'settings.sections.zaps',
    defaultMessage: 'Zaps',
    description: 'Title of the zaps section on the settings page',
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
      defaultMessage: 'A post you were mentioned in was:',
      description: 'Title of the notification settings sub-section for posts you were mentioned in',
    },
    yourPostMentions: {
      id: 'settings.sections.notifications.yourPostMentions',
      defaultMessage: 'A post your post was mentioned in was:',
      description: 'Title of the notification settings sub-section for posts your post was mentioned in',
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
        defaultMessage: 'Handle',
        description: 'Label for name input on edit profile page',
      },
      placeholder : {
        id: 'pages.settings.profile.name.placeholder',
        defaultMessage: 'Enter handle',
        description: 'Placeholder for name input on edit profile page',
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
        defaultMessage: 'Lightning Address',
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
        defaultMessage: 'Verified Nostr Id (Nip-05)',
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
      defaultMessage: 'accounts you follow + your followers',
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
      defaultMessage: 'accounts you follow + everyone they follow',
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

export const thread = {
  sidebar: {
    id: 'thread.sidebar.title',
    defaultMessage: 'People in this thread',
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
    defaultMessage: 'Message posted successfully',
    description: 'Toast message confirming successfull publication of the post',
  },
  publishNoteTimeout: {
    id: 'toast.publishNoteTimeout',
    defaultMessage: 'No relay confirmed reception of your post after 8 seconds',
    description: 'Toast message indicating that no relay confirmed note reception',
  },
  publishNoteFail: {
    id: 'toast.publishNoteFail',
    defaultMessage: 'Failed to publish post',
    description: 'Toast message indicating that post publishing has failed',
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
    defaultMessage: 'Note\'s nostr link copied',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalLinkCoppied: {
    id: 'toast.notePrimalLinkCoppied',
    defaultMessage: 'Note\'s link copied',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalTextCoppied: {
    id: 'toast.notePrimalTextCoppied',
    defaultMessage: 'Note\'s text copied',
    description: 'Confirmation message that the note\'s text has been copied',
  },
  noteIdCoppied: {
    id: 'toast.noteIdCoppied',
    defaultMessage: 'Note\'s id copied',
    description: 'Confirmation message that the note\'s id has been copied',
  },
  noteRawDataCoppied: {
    id: 'toast.noteRawDataCoppied',
    defaultMessage: 'Note\'s raw data copied',
    description: 'Confirmation message that the note\'s raw data has been copied',
  },
  noteAuthorNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'Note\'s author npub copied',
    description: 'Confirmation message that the note\'s author npub has been copied',
  },
  profileNpubCoppied: {
    id: 'toast.noteAuthorNpubCoppied',
    defaultMessage: 'User\'s npub copied',
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
    defaultMessage: 'Author of this post cannot be zapped',
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
  defaultMessage: `Zap {user} `,
  description: 'Caption for custom zap amount modal',
};

export const errors = {
  invalidRelayUrl: {
    id: 'placeholders.invalidRelayUrl',
    defaultMessage: 'Invalid url',
    description: 'Error text for invalid url',
  },
};
