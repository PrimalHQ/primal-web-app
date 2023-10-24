import { Component } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { hookForDev } from "../../lib/devTools";
import ButtonPrimary from "../Buttons/ButtonPrimary";

import { actions as tActions } from "../../translations";

import styles from  "./FloatingNewPostButton.module.scss";
import { useIntl } from "@cookbook/solid-intl";

const FloatingNewPostButton: Component<{ id?: string }> = (props) => {
    const account = useAccountContext();
    const intl = useIntl();

    const showNewNoteForm = () => {
      account?.actions?.showNewNoteForm();
    };


    return (
      <ButtonPrimary
        id={props.id}
        onClick={showNewNoteForm}
      >
        {intl.formatMessage(tActions.newNote)}
      </ButtonPrimary>
    )
}

export default hookForDev(FloatingNewPostButton);
