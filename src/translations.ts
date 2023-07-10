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
    defaultMessage: 'Primal iOS TestFlight is Here!',
    description: 'Title for the downloads\' page call-to-action',
  },
  callToActionDescription: {
    id: 'downloads.ctaDescription',
    defaultMessage: 'The app features easy onboarding, fast & snappy UI, ability to explore Nostr, and create & manage custom feeds',
    description: 'Description for the downloads\' page call-to-action',
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
  links: {
    webApp: {
      id: 'downloads.webAppLink',
      defaultMessage: 'Primal Web App',
      description: 'Label for the link to the web app',
    },
    cachingService: {
      id: 'downloads.cachingService',
      defaultMessage: 'Primal Caching Service',
      description: 'Label for the link to the caching service',
    },
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
  }
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
  fileTypeUpsupported: {
    id: 'toast.unsupportedFileType',
    defaultMessage: 'You can only upload images and videos. This file type is not supported.',
    description: 'Feedback when user tries to upload an unsupported file type',
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
  noteNostrLinkCoppied: {
    id: 'noteNostrLinkCoppied',
    defaultMessage: 'Note\'s nostr link copied',
    description: 'Confirmation message that the note\'s link has been copied',
  },
  notePrimalLinkCoppied: {
    id: 'notePrimalLinkCoppied',
    defaultMessage: 'Note\'s Primal link copied',
    description: 'Confirmation message that the note\'s link has been copied',
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
};

export const zapCustomOption = {
  id: 'zap.custom.option',
  defaultMessage: `Zap {user} `,
  description: 'Caption for custom zap amount modal',
};
