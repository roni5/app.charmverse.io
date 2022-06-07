import nc from 'next-connect';
import { onError, onNoMatch } from 'lib/middleware';
import * as emails from 'lib/emails/emails';

const handler = nc({
  onError,
  onNoMatch
});

const templates = {
  'Notify the user about tasks': () => {
    return emails.getPendingTasksEmail({
      user: {
        id: '<userId>',
        email: '<userEmail>',
        username: 'ghostpepper'
      },
      tasks: [
        {
          tasks: [{
            nonce: 3,
            transactions: [{
              id: '123',
              actions: [],
              date: new Date().toISOString(),
              confirmations: [],
              isExecuted: false,
              description: 'Send .02 ETH',
              gnosisUrl: 'https://gnosis.com',
              myAction: 'Sign',
              myActionUrl: 'https://gnosis.com',
              nonce: 3,
              safeAddress: '0x66525057AC951a0DB5C9fa7fAC6E056D6b8997E2',
              safeName: 'My Personal Safe',
              threshold: 2,
              snoozedUsers: []
            }]
          }],
          safeAddress: '0x123',
          safeName: 'My Personal Safe',
          safeUrl: 'https://app.charmverse.io',
          taskId: '1'
        },
        {
          tasks: [{
            nonce: 7,
            transactions: [{
              id: '123',
              actions: [],
              date: new Date().toISOString(),
              confirmations: [],
              isExecuted: false,
              description: 'Send 10 ETH',
              gnosisUrl: 'https://gnosis.com',
              myAction: 'Sign',
              myActionUrl: 'https://gnosis.com',
              nonce: 7,
              safeAddress: '0x66525057AC951a0DB5C9fa7fAC6E056D6b8997E2',
              safeName: 'Work Safe',
              threshold: 2,
              snoozedUsers: []
            }]
          }],
          safeAddress: '0x456',
          safeName: 'Work Safe',
          safeUrl: 'https://app.charmverse.io',
          taskId: '2'
        }
      ]
    });
  }
};

handler.get(async (req, res) => {

  const renderedEmails = Object.entries(templates).map(([description, output]) => ({
    ...output(),
    description
  }));

  const tpl = `
    <h1 style="background: white; padding: 40px 20px">
      <div style="max-width: 1024px; margin: 0 auto">
        Email Templates
        <hr style="border-color: #eee" />
      </div>
    </h1>
    ${renderedEmails.map(({ description, subject, html }) => `
      <div style="margin: 20px">
        <div style="max-width: 1024px; margin: 0 auto">
          <h2>
            Template: ${description}
          </h2>
          <h3>
            Email Subject: ${subject}
          </h3>
        </div>
      </div>
      <div style="margin-bottom: 20px">${html}</div>`).join('<hr>')}
  `;

  const wrapped = wrapHtml(tpl);

  res.status(200).send(wrapped);

});

function wrapHtml (html: string) {
  return `<html><head><meta charset="UTF-8"></head><body style="font-size: 13px; font-family: arial,sans-serif">${html}</body></html>`;
}

export default handler;