import { Component } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import styles from  "./PostButton.module.scss";

const PostButton: Component< {id?: string } > = (props) => {

    const showPostForm = () => {};

    return (
      <button
        id={props.id}
        class={styles.postButton}
        onClick={showPostForm}
      >
        <div class={styles.postIcon}></div>
      </button>
    )
}

export default hookForDev(PostButton);
