import { Component } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import ButtonPrimary from "../Buttons/ButtonPrimary";

import { actions as tActions } from "../../translations";

import { useIntl } from "@cookbook/solid-intl";
import { showNewNoteForm } from "../../stores/accountStore";

const FloatingNewPostButton: Component<{ id?: string }> = (props) => {
    const intl = useIntl();

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
