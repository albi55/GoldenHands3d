import { useState } from 'react';
import { SITE } from '../../site.config.js';
import { CONTACT, UI } from '../content/chapters';

/**
 * The contact form.
 *
 * With `formEndpoint` set in site.config.js it POSTs there. With it empty
 * — the default, because there is no backend yet — it falls back to
 * opening the visitor's mail client with everything already filled in.
 *
 * The fallback is deliberate rather than a stub. A form that silently
 * fails is worse than no form, and this one always does something: it
 * either delivers, or it hands the message to an app that will. Either
 * way the visitor sees a result.
 *
 * Validation is our own rather than the browser's `required`, so the
 * messages are in Albanian and the invalid field is described to screen
 * readers through aria-invalid / aria-describedby.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMPTY = { name: '', email: '', phone: '', message: '', website: '' };

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | sent | error

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: null }));
  };

  function validate() {
    const next = {};
    if (!values.name.trim()) next.name = UI.formErrName;
    if (!values.email.trim()) next.email = UI.formErrEmailEmpty;
    else if (!EMAIL_RE.test(values.email.trim())) next.email = UI.formErrEmail;
    if (!values.message.trim()) next.message = UI.formErrMessage;
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();

    /* Honeypot: a field no human sees, so anything that fills it is a bot.
       It is reported as sent so the bot does not learn to try again. */
    if (values.website) {
      setState('sent');
      return;
    }

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      /* Move focus to the first problem, or a keyboard user is left
         guessing why nothing happened. */
      document.getElementById('cf-' + Object.keys(found)[0])?.focus();
      return;
    }

    if (!SITE.formEndpoint) {
      const body =
        `${values.message}\n\n— ${values.name}` +
        (values.phone ? `\nTel: ${values.phone}` : '') +
        `\nEmail: ${values.email}`;
      window.location.href =
        `mailto:${CONTACT.email}` +
        `?subject=${encodeURIComponent(CONTACT.subject + ' — ' + values.name)}` +
        `&body=${encodeURIComponent(body)}`;
      setState('sent');
      return;
    }

    setState('sending');
    try {
      const res = await fetch(SITE.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          message: values.message,
          subject: CONTACT.subject,
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setState('sent');
      setValues(EMPTY);
    } catch (err) {
      console.error('[contact] send failed', err);
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="form-done" role="status">
        {SITE.formEndpoint ? UI.formSent : UI.formMailOpened}
      </p>
    );
  }

  const field = (id, label, type, required) => {
    const err = errors[id];
    return (
      <div className={'field' + (err ? ' has-error' : '')}>
        <label htmlFor={'cf-' + id}>
          {label}
          {required && <span aria-hidden> *</span>}
        </label>
        {type === 'textarea' ? (
          <textarea
            id={'cf-' + id}
            name={id}
            rows="4"
            value={values[id]}
            onChange={set(id)}
            aria-invalid={err ? 'true' : undefined}
            aria-describedby={err ? 'cf-' + id + '-err' : undefined}
          />
        ) : (
          <input
            id={'cf-' + id}
            name={id}
            type={type}
            autoComplete={
              id === 'name' ? 'name' : id === 'email' ? 'email' : id === 'phone' ? 'tel' : 'off'
            }
            value={values[id]}
            onChange={set(id)}
            aria-invalid={err ? 'true' : undefined}
            aria-describedby={err ? 'cf-' + id + '-err' : undefined}
          />
        )}
        {err && (
          <p className="field-err" id={'cf-' + id + '-err'}>
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <form className="cform" onSubmit={onSubmit} noValidate>
      {field('name', UI.formName, 'text', true)}
      {field('email', UI.formEmail, 'email', true)}
      {field('phone', UI.formPhone, 'tel', false)}
      {field('message', UI.formMessage, 'textarea', true)}

      {/* Off-screen rather than display:none — some bots skip hidden
          fields, but few skip a visible-to-the-DOM one. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-website">Mos e plotësoni këtë fushë</label>
        <input
          id="cf-website"
          name="website"
          type="text"
          tabIndex="-1"
          autoComplete="off"
          value={values.website}
          onChange={set('website')}
        />
      </div>

      <button className="btn btn-solid" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? UI.formSending : UI.formSubmit}
        <span className="btn-arrow" aria-hidden>
          →
        </span>
      </button>

      {state === 'error' && (
        <p className="form-err" role="alert">
          {UI.formError}{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </p>
      )}
    </form>
  );
}
