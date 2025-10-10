import { NotificationType } from "../../constants";

import userFollow from "../../assets/icons/notifications/user_followed.svg";
import userUnFollow from "../../assets/icons/notifications/user_unfollowed.svg";
import postZapped from "../../assets/icons/notifications/post_zapped.svg";
import postLiked from "../../assets/icons/notifications/post_liked.svg";
import postReposted from "../../assets/icons/notifications/post_reposted.svg";
import postReplied from "../../assets/icons/notifications/post_replied.svg";
import mention from "../../assets/icons/notifications/mention.svg";
import mentionedPost from "../../assets/icons/notifications/mentioned_post.svg";
import mentionZapped from "../../assets/icons/notifications/mention_zapped.svg";
import mentionLiked from "../../assets/icons/notifications/mention_liked.svg";
import mentionReposted from "../../assets/icons/notifications/mention_reposted.svg";
import mentionReplied from "../../assets/icons/notifications/mention_replied.svg";
import mentionedPostZapped from "../../assets/icons/notifications/mentioned_post_zapped.svg";
import mentionedPostLiked from "../../assets/icons/notifications/mentioned_post_liked.svg";
import mentionedPostReposted from "../../assets/icons/notifications/mentioned_post_reposted.svg";
import mentionedPostReplied from "../../assets/icons/notifications/mentioned_post_replied.svg";
import postHighlighted from "../../assets/icons/notifications/post_highlighted.svg";
import postBookmarked from "../../assets/icons/notifications/post_bookmarked.svg";
import postReacted from "../../assets/icons/notifications/post_reacted.svg";

import userFollowLight from "../../assets/icons/notifications/light/user_followed.svg";
import userUnFollowLight from "../../assets/icons/notifications/light/user_unfollowed.svg";
import postZappedLight from "../../assets/icons/notifications/light/post_zapped.svg";
import postLikedLight from "../../assets/icons/notifications/light/post_liked.svg";
import postRepostedLight from "../../assets/icons/notifications/light/post_reposted.svg";
import postRepliedLight from "../../assets/icons/notifications/light/post_replied.svg";
import mentionLight from "../../assets/icons/notifications/light/mention.svg";
import mentionedPostLight from "../../assets/icons/notifications/light/mentioned_post.svg";
import mentionZappedLight from "../../assets/icons/notifications/light/mention_zapped.svg";
import mentionLikedLight from "../../assets/icons/notifications/light/mention_liked.svg";
import mentionRepostedLight from "../../assets/icons/notifications/light/mention_reposted.svg";
import mentionRepliedLight from "../../assets/icons/notifications/light/mention_replied.svg";
import mentionedPostZappedLight from "../../assets/icons/notifications/light/mentioned_post_zapped.svg";
import mentionedPostLikedLight from "../../assets/icons/notifications/light/mentioned_post_liked.svg";
import mentionedPostRepostedLight from "../../assets/icons/notifications/light/mentioned_post_reposted.svg";
import mentionedPostRepliedLight from "../../assets/icons/notifications/light/mentioned_post_replied.svg";
import postHighlightedLight from "../../assets/icons/notifications/light/post_highlighted.svg";
import postBookmarkedLight from "../../assets/icons/notifications/light/post_bookmarked.svg";
import postReactedLight from "../../assets/icons/notifications/light/post_reacted.svg";

import liveEventStarted from "../../assets/icons/notifications/live.svg";

export const notificationIcons: Record<NotificationType, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: userFollow,
  [NotificationType.USER_UNFOLLOWED_YOU]: userUnFollow,

  [NotificationType.YOUR_POST_WAS_ZAPPED]: postZapped,
  [NotificationType.YOUR_POST_WAS_LIKED]: postLiked,
  [NotificationType.YOUR_POST_WAS_REPOSTED]: postReposted,
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: postReplied,

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: mention,
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: mentionedPost,

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: mentionZapped,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: mentionLiked,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: mentionReposted,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: mentionReplied,

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: mentionedPostZapped,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: mentionedPostLiked,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: mentionedPostReposted,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: mentionedPostReplied,

  [NotificationType.YOUR_POST_WAS_HIGHLIGHTED]: postHighlighted,
  [NotificationType.YOUR_POST_WAS_BOOKMARKED]: postBookmarked,
  [NotificationType.YOUR_POST_HAD_REACTION]: postReacted,

  [NotificationType.LIVE_EVENT_STARTED]: liveEventStarted,
};

export const notificationIconsLight: Record<NotificationType, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: userFollowLight,
  [NotificationType.USER_UNFOLLOWED_YOU]: userUnFollowLight,

  [NotificationType.YOUR_POST_WAS_ZAPPED]: postZappedLight,
  [NotificationType.YOUR_POST_WAS_LIKED]: postLikedLight,
  [NotificationType.YOUR_POST_WAS_REPOSTED]: postRepostedLight,
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: postRepliedLight,

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: mentionLight,
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: mentionedPostLight,

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: mentionZappedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: mentionLikedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: mentionRepostedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: mentionRepliedLight,

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: mentionedPostZappedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: mentionedPostLikedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: mentionedPostRepostedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: mentionedPostRepliedLight,

  [NotificationType.YOUR_POST_WAS_HIGHLIGHTED]: postHighlightedLight,
  [NotificationType.YOUR_POST_WAS_BOOKMARKED]: postBookmarkedLight,
  [NotificationType.YOUR_POST_HAD_REACTION]: postReactedLight,

  [NotificationType.LIVE_EVENT_STARTED]: liveEventStarted,
};

export const reactionLikes = [
  "🤙",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤎",
  "🖤",
  "🤍",
  "💖",
  "💗",
  "💓",
  "💞",
  "💕",
  "💝",
  "💟",
  "❣️",
  "💌",
  "💘",
  "💑",
];

export { postLiked, postLikedLight };
