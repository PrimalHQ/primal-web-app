import styles from  "./PostButton.module.scss";

import post from '../../assets/icons/post.svg';

export default function PostButton() {

    const showPostForm = () => {};

    return (
      <button
        class={styles.postButton}
        onClick={showPostForm}
      >
        <div class={styles.postIcon}></div>
      </button>
    )
}
