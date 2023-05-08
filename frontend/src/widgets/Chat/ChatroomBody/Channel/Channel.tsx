import React from 'react'
import { FaLock, FaUsers } from 'react-icons/fa';
import { ImEarth } from 'react-icons/im';

function Channel() {
  return (
    <div className='w-full h-fit py-2.5 border-b-2 border-highlight/50 text-highlight cursor-pointer group'>
      <div className='flex flex-col gap-y-2'>
        <div className='flex flex-row items-center'>
          <p className='w-[16ch] truncate text-base font-extrabold group-hover:underline'>DONKI-DONKI</p>
          <div className='relative aspect-square w-3.5 flex flex-row items-center'>
            <ImEarth />
            {/** TODO: Check channel type */}
            <div className='absolute bottom-0 -right-1'>
              <FaLock className='text-[8px] text-accYellow bg-dimshadow'/>
            </div>
          </div>
          <p className='tracking-wide text-highlight/50 uppercase text-sm ml-5'>public</p>
        </div>
        <div className='w-full flex flex-row justify-between'>
          <div className='flex flex-row text-base font-normal'>
            <p className='whitespace-pre'>owner: </p>
            <p className='bg-accCyan text-base font-normal'>pecking duck</p>
          </div>
          <div className='flex flex-row items-center gap-x-2'>
            <FaUsers />
            10
          </div>
        </div>
      </div>
    </div>
  )
}

export default Channel