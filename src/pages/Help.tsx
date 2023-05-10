import { Component } from 'solid-js';
import Loader from '../components/Loader/Loader';
import MissingPage from '../components/MissingPage/MissingPage';


const Help: Component = () => {
  return (
    <>
      <MissingPage title="help" />
      <Loader />
    </>
  );
}

export default Help;
