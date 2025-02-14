import { Component } from 'solid-js';
import { PrimalUser } from '../../types/primal';
import { useIntl } from '@cookbook/solid-intl';
import { search as t } from '../../translations';
import PeopleList from '../PeopleList/PeopleList';


const SearchSidebar: Component<{ users: PrimalUser[] }> = (props) => {

  const intl = useIntl();

  return (
    <>
      <PeopleList
        people={props.users}
        label={intl.formatMessage(t.sidebarCaption)}
        singleFile={true}
      />
    </>
  );
}

export default SearchSidebar;
