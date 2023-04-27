import React, { useEffect, useState } from 'react'
import sleep from '../../functions/sleep';
import ProfileHeader from './Expanded/ProfileHeader';
import ProfileBody from './Expanded/ProfileBody';
import RecentMatches from './RecentMatches/RecentMatches';
import { UserData } from '../../modal/UserData';
import SocketApi from '../../api/socketApi';
import { status } from '../../functions/friendlist';

interface ProfileProps {
  userData: UserData;
  expanded?: boolean;
}


function Profile(props: ProfileProps) {
  const { userData } = props;
  const [pixelSize, setPixelSize] = useState(400);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("online");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (props.expanded) setExpanded(true);
    else setExpanded(false);
  }, [props.expanded]);

  useEffect(() => {
    pixelatedToSmooth();
    const socketApi = new SocketApi();
    socketApi.sendMessages("statusRoom", { intraName: userData.intraName, joining: true });
    socketApi.listen("statusRoom", (data: any) => {
      if (data !== undefined && data.status !== undefined)
        setStatus((data.status as string).toLowerCase());
    });

    return () => {
      socketApi.removeListener("statusRoom");
      socketApi.sendMessages("statusRoom", { intraName: userData.intraName, joining: false });
    }
  }, [userData.avatar, userData.intraName]);

  return (<div className='w-full bg-highlight flex flex-col items-center box-border'
    onClick={onProfileClick}
  >
    <ProfileHeader expanded={expanded} userData={userData} status={status} />
    <ProfileBody expanded={expanded} pixelSize={pixelSize} userData={userData} status={status} />
    <RecentMatches expanded={expanded} />
  </div>);

  async function pixelatedToSmooth(start: number = 200) {
    let tmp = start;
    // style 1 jaggled animation
    // while (tmp > 1) {
    //   tmp = Math.floor(tmp / 1.2 - 1);
    //   if (tmp < 1) tmp = 1;
    //   setPixelSize(tmp);
    //   await sleep(80);
    // }
    // style 2 smooth animation
    while (tmp > 1) {
      tmp = Math.floor(tmp / 1.05);
      if (tmp < 1) tmp = 1;
      setPixelSize(tmp);
      await sleep(10);
    }
  }

  async function onProfileClick() {
    if (animating) return;
    handleAnimate();
    setExpanded(!expanded);
    if (pixelSize > 1) return;
    pixelatedToSmooth();
  }

  async function handleAnimate() {
    setAnimating(true);
    await sleep(500);
    setAnimating(false);
  }
}

export default Profile