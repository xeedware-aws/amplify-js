// tslint:disable
/*
 * Copyright 2017-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
// tslint:enable

import {
	Component,
	Input,
	OnInit,
	Inject,
	OnChanges,
	SimpleChanges,
} from '@angular/core';
import { AmplifyService } from '../../../providers/amplify.service';
import { AuthState } from '../../../providers/auth.state';
import { auth } from '../../../assets/data-test-attributes';
import defaultSignUpFieldAssets from '../../../assets/default-sign-up-fields';
import { SignUpField } from '../sign-up-component/sign-up.component.core';
import { PhoneFieldOutput } from '../types';
import { composePhoneNumber } from '../common';
import { CognitoUser } from 'amazon-cognito-identity-js';

const template = `
<div class="amplify-container" *ngIf="_show">
<div class="amplify-form-container" data-test="${auth.requireNewPassword.section}">
  <div class="amplify-form-body" data-test="${auth.requireNewPassword.bodySection}">
  <div class="amplify-form-header" data-test="${auth.requireNewPassword.headerSection}">
    {{ this.amplifyService.i18n().get('You are required to update your password') }}
  </div>
  <div class="amplify-form-row">
    <label class="amplify-input-label" for="password">
      {{ this.amplifyService.i18n().get('Password *') }}
    </label>
    <input #password
      (keyup)="setPassword(password.value)"
      (keyup.enter)="onSubmit()"
      class="amplify-form-input"
      type="password"
      placeholder="{{ this.amplifyService.i18n().get('Password') }}"
      data-test="${auth.requireNewPassword.newPasswordInput}"
    />
	</div>
	  <div class="amplify-form-row" *ngFor="let field of requiredFields">
			<div *ngIf="field.key !== 'phone_number'">
				<label class="amplify-input-label">
					{{ this.amplifyService.i18n().get(field.label) }}
					<span *ngIf="field.required">*</span>
				</label>
				<input #{{field.key}}
					class="amplify-form-input"
					[ngClass]="{'amplify-input-invalid ': field.invalid}"
					type={{field.type}}
					[placeholder]="this.amplifyService.i18n().get(field.label)"
					[(ngModel)]="requiredAttributes[field.key]"
					name="field.key"
					data-test="${auth.signUp.nonPhoneNumberInput}"
					/>
					<div *ngIf="field.key === 'password'" class="amplify-form-extra-details">
						{{passwordPolicy}}
					</div>
			</div>
			<div *ngIf="field.key === 'phone_number'">
				<amplify-auth-phone-field-core
					[label]="field.label"
					[required]="field.required"
					[placeholder]="field.placeholder"
					[defaultCountryCode]="country_code"
					(phoneFieldChanged)="onPhoneFieldChanged($event)"
				></amplify-auth-phone-field-core>
			</div>
    </div>
    <div class="amplify-form-actions">
      <div class="amplify-form-cell-left">
        <a class="amplify-form-link"
          (click)="onSignIn()"
          data-test="${auth.requireNewPassword.backToSignInLink}"
        >{{ this.amplifyService.i18n().get('Back to Sign In') }}</a>
      </div>
      <div class="amplify-form-cell-right">
        <button class="amplify-form-button"
          (click)="onSubmit()"
          data-test="${auth.requireNewPassword.submitButton}"
        >{{ this.amplifyService.i18n().get('Submit') }}</button>
      </div>
    </div>
  </div>
</div>
<div class="amplify-alert" *ngIf="errorMessage">
<div class="amplify-alert-body">
  <span class="amplify-alert-icon">&#9888;</span>
  <div class="amplify-alert-message">{{ this.amplifyService.i18n().get(errorMessage) }}</div>
  <a class="amplify-alert-close" (click)="onAlertClose()">&times;</a>
</div>
</div>
</div>
`;

@Component({
	selector: 'amplify-auth-require-new-password-core',
	template,
})
export class RequireNewPasswordComponentCore implements OnInit, OnChanges {
	_authState: AuthState;
	_show: boolean;
	_signUpConfig: any;
	password: string;
	errorMessage: string;
	user: CognitoUser | any;
	requiredAttributeKeys: string[];
	requiredAttributes: { [key: string]: string } = {};
	local_phone_number: string;
	country_code: string = '1';
	signUpFields: SignUpField[] = defaultSignUpFieldAssets;
	hiddenFields: any = [];
	passwordPolicy: string;
	requiredFields: SignUpField[];
	protected logger: any;

	constructor(
		@Inject(AmplifyService) protected amplifyService: AmplifyService
	) {
		this.logger = this.amplifyService.logger('RequireNewPasswordComponent');
	}

	@Input()
	set authState(authState: AuthState) {
		this._authState = authState;
		this._show = authState.state === 'requireNewPassword';
	}

	@Input() hide: string[] = [];

	@Input()
	set data(data: any) {
		this._authState = data.authState;
		this._show = data.authState.state === 'requireNewPassword';
		this.hide = data.hide ? data.hide : this.hide;
		if (data.signUpConfig) {
			this._signUpConfig = data.signUpConfig;
			if (this._signUpConfig.defaultCountryCode) {
				this.country_code = this._signUpConfig.defaultCountryCode;
			}
			this.signUpFields = this._signUpConfig.signUpFields
				? this._signUpConfig.signUpFields
				: defaultSignUpFieldAssets;
			if (this._signUpConfig.passwordPolicy) {
				this.passwordPolicy = this._signUpConfig.passwordPolicy;
			}
		}
	}

	@Input()
	set signUpConfig(signUpConfig: any) {
		if (signUpConfig) {
			this._signUpConfig = signUpConfig;
			if (this._signUpConfig.defaultCountryCode) {
				this.country_code = this._signUpConfig.defaultCountryCode;
			}
			this.signUpFields = this._signUpConfig.signUpFields
				? this._signUpConfig.signUpFields
				: defaultSignUpFieldAssets;
			if (this._signUpConfig.passwordPolicy) {
				this.passwordPolicy = this._signUpConfig.passwordPolicy;
			}
		}
	}

	ngOnInit() {
		if (!this.amplifyService.auth()) {
			throw new Error('Auth module not registered on AmplifyService provider');
		}
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['authState']) {
			const previous: AuthState = changes['authState'].previousValue;
			const current: AuthState = changes['authState'].currentValue;
			if (
				current.state === 'requireNewPassword' &&
				previous.state !== 'requireNewPassword'
			) {
				this.user = this._authState.user;
				console.log(JSON.stringify(this.user));
				if (
					this.user &&
					this.user.challengeParam &&
					this.user.challengeParam.requiredAttributes
				) {
					this.requiredAttributeKeys = this.user.challengeParam.requiredAttributes;
					this.requiredFields = this.signUpFields
						.filter(f => {
							return this.requiredAttributeKeys.indexOf(f.key) > -1;
						})
						.sort((a, b) => {
							if (a.displayOrder && b.displayOrder) {
								if (a.displayOrder < b.displayOrder) {
									return -1;
								} else if (a.displayOrder > b.displayOrder) {
									return 1;
								} else {
									if (a.key < b.key) {
										return -1;
									} else {
										return 1;
									}
								}
							} else if (!a.displayOrder && b.displayOrder) {
								return 1;
							} else if (a.displayOrder && !b.displayOrder) {
								return -1;
							} else if (!a.displayOrder && !b.displayOrder) {
								if (a.key < b.key) {
									return -1;
								} else {
									return 1;
								}
							}
						});
				}
			}
		}
	}

	shouldHide(comp) {
		return this.hide.filter(item => item === comp).length > 0;
	}

	setPassword(password: string) {
		this.password = password;
	}

	validateRequiredAttributes() {
		const invalids = [];
		this.requiredFields.map(f => {
			if (f.key !== 'phone_number') {
				if (f.required && !this.requiredAttributes[f.key]) {
					f.invalid = true;
					invalids.push(this.amplifyService.i18n().get(f.label));
				} else {
					f.invalid = false;
				}
			} else {
				if (f.required && (!this.country_code || !this.local_phone_number)) {
					f.invalid = true;
					invalids.push(this.amplifyService.i18n().get(f.label));
				} else {
					f.invalid = false;
				}
			}
		});
		return invalids;
	}

	onSubmit() {
		// validate  required fields
		const validationErrors = this.validateRequiredAttributes();
		if (validationErrors && validationErrors.length > 0) {
			return this._setError(
				`The following fields need to be filled out: ${validationErrors.join(
					', '
				)}`
			);
		}

		this.requiredFields.forEach(f => {
			if (f.key === 'phone_number') {
				// format phone number
				this.requiredAttributes.phone_number = composePhoneNumber(
					this.country_code,
					this.local_phone_number
				);
			} // Otherwise, use values entered for <input>
		});

		this.amplifyService
			.auth()
			.completeNewPassword(this.user, this.password, this.requiredAttributes)
			.then(() => {
				this.onAlertClose();
				const nextAuthState = { state: 'signIn', user: this.user };
				this.amplifyService.setAuthState(nextAuthState);
				this.authState = nextAuthState;
			})
			.catch(err => this._setError(err));
	}

	onSignIn() {
		this.onAlertClose();
		this.amplifyService.setAuthState({ state: 'signIn', user: null });
	}

	onAlertClose() {
		this._setError(null);
	}

	_setError(err) {
		if (!err) {
			this.errorMessage = null;
			return;
		}

		this.errorMessage = err.message || err;
	}

	onPhoneFieldChanged(event: PhoneFieldOutput) {
		this.country_code = event.country_code;
		this.local_phone_number = event.local_phone_number;
	}
}
