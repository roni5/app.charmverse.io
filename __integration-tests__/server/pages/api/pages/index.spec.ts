/* eslint-disable @typescript-eslint/no-unused-vars */
import { Prisma, Space, User } from '@prisma/client';
import { IPageWithPermissions } from 'lib/pages';
import { addSpaceOperations } from 'lib/permissions/spaces';
import request from 'supertest';
import { generatePageToCreateStub } from 'testing/generate-stubs';
import { baseUrl, loginUser } from 'testing/mockApiCall';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';
import { v4 } from 'uuid';

describe('POST /api/pages - create page', () => {

  it('should create a page if the non-admin user has the permission and return it, responding with 201', async () => {

    const { user, space } = await generateUserAndSpaceWithApiToken(v4(), false);

    await addSpaceOperations({
      forSpaceId: space.id,
      spaceId: space.id,
      operations: ['createPage']
    });

    const userCookie = await loginUser(user);

    const pageToCreate: Prisma.PageCreateInput = generatePageToCreateStub({
      userId: user.id,
      spaceId: space.id
    });

    const { body: createdPage } = await request(baseUrl)
      .post('/api/pages')
      .set('Cookie', userCookie)
      .send(pageToCreate)
      .expect(201) as {body: IPageWithPermissions};

    expect(createdPage.spaceId).toBe(pageToCreate.space?.connect?.id as string);
    expect(createdPage.path).toBe(pageToCreate.path);
    expect(createdPage.createdBy).toBe(pageToCreate.author.connect?.id);

  });

  it('should allow admins to create a page even if no permission exists, and return it, responding with 201', async () => {

    const { user, space } = await generateUserAndSpaceWithApiToken(v4(), true);

    const userCookie = await loginUser(user);

    const pageToCreate: Prisma.PageCreateInput = generatePageToCreateStub({
      userId: user.id,
      spaceId: space.id
    });

    const { body: createdPage } = await request(baseUrl)
      .post('/api/pages')
      .set('Cookie', userCookie)
      .send(pageToCreate)
      .expect(201) as {body: IPageWithPermissions};

    expect(createdPage.spaceId).toBe(pageToCreate.space?.connect?.id as string);
    expect(createdPage.path).toBe(pageToCreate.path);
    expect(createdPage.createdBy).toBe(pageToCreate.author.connect?.id);

  });

  it('should fail to create a page if the non-admin user does not have the permission and return it, responding with 401', async () => {

    const { user, space } = await generateUserAndSpaceWithApiToken(v4(), false);

    const userCookie = await loginUser(user);

    const pageToCreate: Prisma.PageCreateInput = generatePageToCreateStub({
      userId: user.id,
      spaceId: space.id
    });

    await request(baseUrl)
      .post('/api/pages')
      .set('Cookie', userCookie)
      .send(pageToCreate)
      .expect(401);

  });
});