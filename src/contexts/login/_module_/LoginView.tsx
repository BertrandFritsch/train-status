import * as React from 'react';

import './LoginView.scss';
import {LoginCredentials} from './reducers';

interface Props {
  loggedIn: boolean;
  username: string;

  backComponent: React.ComponentClass;

  onLoginRequested: (creds: LoginCredentials) => void;
}

export default class LoginView extends React.PureComponent<Props> {
    username = '';
    password = '';

  componentWillReceiveProps(nextProps: Props) {
    this.username = nextProps.username;
  }

  render() {
    return (
      <div className={ `login-flip-container${ this.props.loggedIn ? ' login-flip-container-flipped' : ''}` }>
        <div className="login-flip-container-flipper">
          <div className="login-flip-container-front">
            <div className="login-flip-container-page">
              <div className="login-flip-container-form">
                <div className="login-flip-container-page-img-container">
                  <img src="http://www.flaminem.com/wp-content/themes/flaminem/images/logo.png" alt="Flaminem"/>
                </div>
                <label>Authentification</label>
                <input type="text" placeholder="Utilisateur"/>
                <input type="password" placeholder="Mot de passe"/>
                <button onClick={ () => this.props.onLoginRequested({ username: this.username, password: this.password }) }>Se connecter</button>
              </div>
            </div>
          </div>
          <div className="login-flip-container-back">
            { this.props.backComponent }
          </div>
        </div>
      </div>
    );
  }
}
