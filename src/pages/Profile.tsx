import {
  Component,
  Show,
} from 'solid-js';

import ProfileMobile from './ProfileMobile';
import ProfileDesktop from './ProfileDesktop';
import { isPhone } from '../utils';

const Profile: Component = () => {

  return (
    <>
      <Show
        when={isPhone()}
        fallback={<ProfileDesktop />}
      >
        <ProfileMobile />
      </Show>
    </>
  )
}

export default Profile;
