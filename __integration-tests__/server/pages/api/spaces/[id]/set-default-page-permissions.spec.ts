/* eslint-disable @typescript-eslint/no-unused-vars */
import { Space, User } from '@prisma/client';
import request from 'supertest';
import { baseUrl } from 'testing/mockApiCall';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';

let nonAdminUser: User;
let nonAdminUserSpace: Space;
let nonAdminCookie: string;

let adminUser: User;
let adminUserSpace: Space;
let adminCookie: string;

beforeAll(async () => {
  const generated1 = await generateUserAndSpaceWithApiToken(undefined, false);
  nonAdminUser = generated1.user;
  nonAdminUserSpace = generated1.space;
  nonAdminCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: nonAdminUser.addresses[0]
    })).headers['set-cookie'][0];

  const generated2 = await generateUserAndSpaceWithApiToken(undefined, true);
  adminUser = generated2.user;
  adminUserSpace = generated2.space;
  adminCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: adminUser.addresses[0]
    })).headers['set-cookie'][0];
});

describe('POST /api/spaces/[id]/set-default-page-permissions - Set default page permission level for a space', () => {
  it('should retrieve updated space with updated defaultPagePermissionGroup', async () => {
    const updatedSpace = (await request(baseUrl)
      .post(`/api/spaces/${adminUserSpace.id}/set-default-page-permissions`)
      .set('Cookie', adminCookie)
      .send({
        pagePermissionLevel: 'view_comment'
      })
      .expect(200)).body as Space;
    expect(updatedSpace.defaultPagePermissionGroup).toBe('view_comment');
  });

  it('should fail if the user is not an admin of the space, and respond 401', async () => {
    await request(baseUrl)
      .post(`/api/spaces/${nonAdminUserSpace.id}/set-default-page-permissions`)
      .set('Cookie', nonAdminCookie)
      .send({
        pagePermissionLevel: 'full_access'
      })
      .expect(401);
  });
});