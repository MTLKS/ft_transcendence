import React from 'react'
import PixelatedImage from '../../../components/PixelatedImage'
import ProfileSmall from './ProfileSmall';
import ProfileElo from './ProfileElo';
import ProfileStat from './ProfileStat';

interface ProfileBodyProps {
  pixelSize: number
  expanded: boolean;
  animate?: boolean;
}

function ProfileBody(props: ProfileBodyProps) {
  const { pixelSize, expanded, animate } = props;
  return (
    <div className={` flex flex-row w-full box-border transition-all duration-300 ease-in-out ${!expanded ? "h-20" : "mb-1"}`}>
      <div className={expanded ? 'flex-1 mr-1 bg-dimshadow transition-all' : 'w-20 h-20 aspect-square transition-all'}>
        <PixelatedImage src='https://cdn.intra.42.fr/users/5452393b87392f586be0b0fe37d5f9c1/large_zah.jpg' pixelSize={pixelSize} className='w-full' />
      </div>
      <ProfileSmall expanded={!expanded} />
      <div className={expanded ? 'mr-1 bg-dimshadow flex-1 transition-all duration-1000 ease-in-out' : 'h-20 transition-all duration-1000 ease-in-out'}>
        <ProfileElo expanded={expanded} animate={animate} />
      </div>
      <ProfileStat expanded={expanded} />
    </div>
  )
}

export default ProfileBody