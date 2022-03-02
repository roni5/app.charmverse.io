
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import { Block } from '@prisma/client';
import { prisma } from 'db';
import { onError, onNoMatch } from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';

// TODO: frontend should tell us which space to use
export type ServerBlockFields = 'spaceId' | 'updatedBy' | 'createdBy';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler.get(getBlockSubtree);

async function getBlockSubtree (req: NextApiRequest, res: NextApiResponse<Block[] | { error: string }>) {
  const boardId = req.query.id as string;
  const publicPage = await prisma.page.findFirst({
    where: {
      boardId
    }
  });
  if (!publicPage || !publicPage.isPublic) {
    return res.status(404).json({ error: 'page not found' });
  }
  const blocks = await prisma.block.findMany({
    where: {
      rootId: boardId
    }
  });
  return res.status(200).json(blocks);
}

export default withSessionRoute(handler);