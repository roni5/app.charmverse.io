/* eslint-disable @typescript-eslint/no-unused-vars */
import { Bounty, Prisma, Space, User } from '@prisma/client';
import { IPageWithPermissions } from 'lib/pages';
import request from 'supertest';
import { generatePageToCreateStub } from 'testing/generate-stubs';
import { baseUrl, loginUser } from 'testing/mockApiCall';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';
import { v4 } from 'uuid';
import { createBounty } from 'lib/bounties';
import { addSpaceOperations } from 'lib/permissions/spaces';
import { prisma } from 'db';

let nonAdminUser: User;
let nonAdminUserSpace: Space;
let nonAdminCookie: string;

let adminUser: User;
let adminUserSpace: Space;
let adminCookie: string;

beforeAll(async () => {
  const first = await generateUserAndSpaceWithApiToken(undefined, false);

  nonAdminUser = first.user;
  nonAdminUserSpace = first.space;
  nonAdminCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: nonAdminUser.addresses[0]
    })).headers['set-cookie'][0];

  const second = await generateUserAndSpaceWithApiToken();

  adminUser = second.user;
  adminUserSpace = second.space;
  adminCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: adminUser.addresses[0]
    })).headers['set-cookie'][0];
});

describe('GET /api/bounties?spaceId={spaceId} - list space bounties', () => {

  it('should return the bounties available to a workspace member, and respond 200', async () => {

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: nonAdminUser.id,
      spaceId: nonAdminUserSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    await createBounty(creationContent as Bounty);

    const bounties = (await request(baseUrl)
      .get(`/api/bounties?spaceId=${nonAdminUserSpace.id}`)
      .set('Cookie', nonAdminCookie)
      .send(creationContent)
      .expect(200)).body as Bounty[];

    expect(bounties.length).toBe(1);

    const bounty = bounties[0];

    expect(bounty).toEqual(
      expect.objectContaining<Partial<Bounty>>({
        title: creationContent.title,
        createdBy: nonAdminUser.id,
        spaceId: nonAdminUserSpace.id,
        status: creationContent.status,
        rewardAmount: creationContent.rewardAmount,
        chainId: creationContent.chainId,
        rewardToken: creationContent.rewardToken
      })
    );

  });

  it('should return the bounties available to the public if this is enabled, and respond 200', async () => {

    const { space: otherSpace, user: otherUser } = await generateUserAndSpaceWithApiToken(undefined, false);

    await prisma.space.update({
      where: {
        id: otherSpace.id
      },
      data: {
        publicBountyBoard: true
      }
    });

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: otherUser.id,
      spaceId: otherSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    // Create a bounty viewable by the space
    await createBounty({ ...(creationContent as Bounty),
      permissions: {
        viewer: [{
          group: 'space',
          id: otherSpace.id
        }]
      } });

    // Unauthenticated request
    const bounties = (await request(baseUrl)
      .get(`/api/bounties?spaceId=${otherSpace.id}`)
      .send(creationContent)
      .expect(200)).body as Bounty[];

    expect(bounties.length).toBe(1);

    const bounty = bounties[0];

    expect(bounty).toEqual(
      expect.objectContaining<Partial<Bounty>>({
        title: creationContent.title,
        createdBy: otherUser.id,
        spaceId: otherSpace.id,
        status: creationContent.status,
        rewardAmount: creationContent.rewardAmount,
        chainId: creationContent.chainId,
        rewardToken: creationContent.rewardToken
      })
    );

  });

  it('should return only the bounties available to the public if this is requested by the user, ignoring the bounties they have access to, and respond 200', async () => {

    const { space: otherSpace, user: otherUser } = await generateUserAndSpaceWithApiToken(undefined, false);

    const otherUserCookie = await loginUser(otherUser);

    await prisma.space.update({
      where: {
        id: otherSpace.id
      },
      data: {
        publicBountyBoard: true
      }
    });

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: otherUser.id,
      spaceId: otherSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    // Create a bounty viewable by the space
    const visibleBounty = await createBounty({ ...(creationContent as Bounty),
      permissions: {
        viewer: [{
          group: 'space',
          id: otherSpace.id
        }]
      } });

    // Create a bounty viewable only by this user
    await createBounty({ ...(creationContent as Bounty),
      permissions: {
        viewer: [{
          group: 'user',
          id: otherUser.id
        }]
      } });

    // Authenticated request, where we specify that we only want to see public data
    const bounties = (await request(baseUrl)
      .get(`/api/bounties?spaceId=${otherSpace.id}&publicOnly=${true}`)
      .set('Cookie', otherUserCookie)
      .send(creationContent)
      .expect(200)).body as Bounty[];

    // We shoukd only have received one result
    expect(bounties.length).toBe(1);

    const bounty = bounties[0];

    expect(bounty.id).toBe(visibleBounty.id);

  });

  it('should return an empty list if public bounties are disabled, and respond 200', async () => {

    const { space: otherSpace, user: otherUser } = await generateUserAndSpaceWithApiToken(undefined, false);

    await prisma.space.update({
      where: {
        id: otherSpace.id
      },
      data: {
        publicBountyBoard: false
      }
    });

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: otherUser.id,
      spaceId: otherSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    // Create a bounty viewable by the space
    await createBounty({ ...(creationContent as Bounty),
      permissions: {
        viewer: [{
          group: 'space',
          id: otherSpace.id
        }]
      } });

    // Unauthenticated request
    const bounties = (await request(baseUrl)
      .get(`/api/bounties?spaceId=${otherSpace.id}`)
      .send(creationContent)
      .expect(200)).body as Bounty[];

    expect(bounties.length).toBe(0);

  });
});

describe('POST /api/bounties - create a bounty', () => {

  it('should allow admin users to create an open bounty, and respond 201', async () => {

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: adminUser.id,
      spaceId: adminUserSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    const createdBounty = (await request(baseUrl)
      .post('/api/bounties')
      .set('Cookie', adminCookie)
      .send(creationContent)
      .expect(201)).body;

    expect(createdBounty).toEqual(
      expect.objectContaining<Partial<Bounty>>({
        title: creationContent.title,
        createdBy: adminUser.id,
        spaceId: adminUserSpace.id,
        status: creationContent.status,
        rewardAmount: creationContent.rewardAmount,
        chainId: creationContent.chainId,
        rewardToken: creationContent.rewardToken
      })
    );

  });

  it('should allow non-admin users to create a bounty suggestion, and respond 201', async () => {

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: nonAdminUser.id,
      spaceId: nonAdminUserSpace.id,
      status: 'suggestion'
    };

    const createdBounty = (await request(baseUrl)
      .post('/api/bounties')
      .set('Cookie', nonAdminCookie)
      .send(creationContent)
      .expect(201)).body;

    expect(createdBounty).toEqual(
      expect.objectContaining<Partial<Bounty>>({
        title: creationContent.title,
        createdBy: nonAdminUser.id,
        spaceId: nonAdminUserSpace.id,
        status: creationContent.status
      })
    );

  });

  it('should allow non-admin users with createBounty permission to create an open bounty, and respond 201', async () => {

    const { space: differentSpace, user: differentUser } = await generateUserAndSpaceWithApiToken(undefined, false);

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: differentUser.id,
      spaceId: differentSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    await addSpaceOperations({
      forSpaceId: differentSpace.id,
      operations: ['createBounty'],
      userId: differentUser.id
    });

    const cookie = await loginUser(differentUser);

    const createdBounty = (await request(baseUrl)
      .post('/api/bounties')
      .set('Cookie', cookie)
      .send(creationContent)
      .expect(201)).body;

    expect(createdBounty).toEqual(
      expect.objectContaining<Partial<Bounty>>({
        title: creationContent.title,
        createdBy: differentUser.id,
        spaceId: differentSpace.id,
        status: creationContent.status
      })
    );

  });

  it('should not allow non-admin users without createBounty permission to create an open bounty, and respond 401', async () => {

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: nonAdminUser.id,
      spaceId: nonAdminUserSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    await request(baseUrl)
      .post('/api/bounties')
      .set('Cookie', nonAdminCookie)
      .send(creationContent)
      .expect(401);
  });

  it('should not allow users to create a bounty in a space they are not a member of, and respond 401', async () => {

    const creationContent: Partial<Bounty> = {
      title: 'Example',
      createdBy: adminUser.id,
      spaceId: nonAdminUserSpace.id,
      status: 'open',
      rewardAmount: 5,
      chainId: 1,
      rewardToken: 'ETH'
    };

    await request(baseUrl)
      .post('/api/bounties')
      .set('Cookie', adminCookie)
      .send(creationContent)
      .expect(401);

  });

});
