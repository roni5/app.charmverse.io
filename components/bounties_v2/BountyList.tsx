import { useState, useRef } from 'react';
import { Bounty as IBounty } from '@prisma/client';
import Loader from 'components/common/Loader';
import { Bounty } from 'components/bounties_v2/Bounty';
import { Typography, Button, Grid } from '@mui/material';
import BountyModal from 'components/bounties_v2/BountyModal';
import BountyService from './BountyService';
import { BountyEditor } from './BountyEditor';

export function BountyList () {

  const [bountyList, setBountyList] = useState([] as IBounty []);
  const refresh = useRef(true);
  const [displayBountyDialog, setDisplayBountyDialog] = useState(false);

  async function refreshBounties () {
    try {
      const foundBounties = await BountyService.listBounties();

      // Tenporary measure to seed new bounties so we can experiment with different colour statuses
      /*
      while (foundBounties.length >= 2 && foundBounties.length < 15) {

        const position = Math.random() > 0.5 ? 0 : 1;

        const copiedBounty = { ...foundBounties[position] };

        const random = Math.random();

        const randomStatus: BountyStatus = random < 0.2 ? 'open'
          : random < 0.4 ? 'assigned'
            : random < 0.6 ? 'review'
              : random < 0.8 ? 'complete'
                : 'paid';

        copiedBounty.status = randomStatus;

        foundBounties.push(copiedBounty);
      }
      */

      setBountyList(foundBounties);

    }
    catch (error) {
      // Handle error later
    }

    refresh.current = false;

    // Test to generate a bunch of statuses
  }

  function bountyCreated () {
    // Empty the bounty list so we can reload bounties
    refresh.current = true;
    setDisplayBountyDialog(false);
    refreshBounties();
  }

  if (refresh.current === true) {

    refreshBounties();

    return <Loader message='Searching for bounties' />;
  }
  else {
    return (
      <Grid container>

        <Grid item container xs alignItems='center'>

          {
            /**
             * Remove later to its own popup modal
             */
            displayBountyDialog === true && (
              <>
                <BountyModal onSubmit={bountyCreated} open={displayBountyDialog} onClose={bountyCreated} />

                {/*
                <Grid item xs={12}>
                  <BountyEditor bounty={{ title: 'Prefilled bounty' } as any} mode='create' onSubmit={bountyCreated} />
                </Grid>
                */}

              </>
            )
          }

          <Grid item xs={8}>
            <h1>Bounty list</h1>
          </Grid>

          <Grid item xs={4}>
            <Button
              variant='outlined'
              onClick={() => {
                setDisplayBountyDialog(true);
              }}
              sx={{ margin: 'auto', float: 'right' }}
            >
              Create Bounty
            </Button>
          </Grid>

        </Grid>

        <Grid container>

          {
        bountyList.length === 0 && <Typography paragraph={true}>No bounties were found</Typography>
      }

          { bountyList.length > 0
        && bountyList?.map(availableBounty => {
          return <Bounty key={availableBounty.id + Math.random().toString()} bounty={availableBounty} />;
        })}

        </Grid>

      </Grid>
    );
  }
}