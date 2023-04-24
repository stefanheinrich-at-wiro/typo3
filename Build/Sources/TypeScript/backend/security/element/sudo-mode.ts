/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

import { customElement, property, query, state } from 'lit/decorators';
import { html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import AjaxRequest from '@typo3/core/ajax/ajax-request';
import { AjaxResponse } from '@typo3/core/ajax/ajax-response';
import { styleTag, lll } from '@typo3/core/lit-helper';

interface SudoModeResponse {
  message: string;
  redirect?: {
    uri: string,
    target: string,
  }
}

/**
 * Web Component showing the sudo mode password dialogs. The password verification
 * happens via AJAX, the redirect to the actually requested resources is triggered
 * by this JavaScript component as well - since it is capable of navigating to the
 * `top` frame directly (compared to using `target` in e.g. Fluid HTML).
 */
@customElement('typo3-backend-security-sudo-mode')
export class SudoMode extends LitElement {
  @property({ type: String }) verifyActionUri: string;
  @state() useInstallToolPassword = false;
  @state() errorMessage: string = null;
  @query('#password') passwordElement: HTMLInputElement;

  public createRenderRoot(): HTMLElement | ShadowRoot {
    // Avoid shadow DOM for Bootstrap CSS to be applied
    return this;
  }

  public render(): TemplateResult {
    return html`
      ${styleTag`
        :host { display: block; }
        #sudo-mode-verification { display: block; }
      `}
      <div id="sudo-mode-verification" class="modal modal-severity-notice modal-size-small" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">
                ${lll(this.useInstallToolPassword ? 'verifyWithInstallToolPassword' : 'verifyWithUserPassword')}
              </h4>
            </div>
            <div class="modal-body">
              <div>
                ${this.errorMessage ? html`
                  <div class="alert alert-danger" id="invalid-password">${lll(this.errorMessage) || this.errorMessage}</div>
                ` : nothing}
                <form method="post" class="form" id="verify-sudo-mode" spellcheck="false" @submit=${(evt: SubmitEvent) => this.verifyPassword(evt)}>
                  <div class="form-group">
                    <label class="form-label" for="password">${lll('password')}</label>
                    <input required="required" class="form-control" id="password" type="password" name="password"
                            autocomplete=${this.useInstallToolPassword ? 'section-install current-password' : 'current-password'}>
                  </div>
                </form>
                <div class="text-end">
                  <a href="#" @click=${(evt: MouseEvent) => this.toggleUseInstallToolPassword(evt)}>
                    ${lll(this.useInstallToolPassword ? 'userPasswordMode' : 'installToolPasswordMode')}
                  </a>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" form="verify-sudo-mode" class="btn btn-primary" role="button">
                ${lll('verify')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.passwordElement.focus();
  }

  private verifyPassword(evt: SubmitEvent): void {
    evt.preventDefault();
    this.errorMessage = null;
    (new AjaxRequest(this.verifyActionUri))
      .post({ password: this.passwordElement.value, useInstallToolPassword: this.useInstallToolPassword ? 1 : 0 })
      .then(async (ajaxResponse: AjaxResponse) => {
        const response: SudoModeResponse = await ajaxResponse.resolve('application/json');
        if (response.redirect) {
          const targetDocument = response.redirect.target === 'top' ? top.document : document;
          targetDocument.location.href = response.redirect.uri;
        }
      })
      .catch(async (ajaxResponse: AjaxResponse) => {
        const response = await ajaxResponse.resolve('application/json');
        this.errorMessage = response.message;
      });
  }

  private toggleUseInstallToolPassword(evt: MouseEvent): void {
    evt.preventDefault();
    this.useInstallToolPassword = !this.useInstallToolPassword;
  }
}
