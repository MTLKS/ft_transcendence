import React, { useEffect, useRef, useState } from 'react'
import FriendlistTitle from './FriendlistTitle'
import FriendlistCategory from './FriendlistCategory';
import EmptyFriendlist from './EmptyFriendlist';
import { UserData } from '../../modal/UserData';
import { FriendData, FriendTags } from '../../modal/FriendData';
import FriendlistEmptyLine from './FriendlistEmptyLine';
import FriendlistTag from './FriendlistTag';
import FriendInfo from './FriendInfo';

interface FriendlistProps {
  userData: UserData;
  friendsData: FriendData[];
  onQuit: () => void;
}

function Friendlist(props: FriendlistProps) {

  // Props
  const { userData, friendsData, onQuit } = props;

  // Use Hooks
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [maxDisplayLines, setMaxDisplayLines] = useState(0);
  const [startingIndex, setStartingIndex] = useState(0);
  const [endingIndex, setEndingIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // Filtered Raw data
  const acceptedFriends = filterFriends(friendsData, FriendTags.accepted);
  const pendingFriends = filterFriends(friendsData, FriendTags.pending);
  const blockedFriends = filterFriends(friendsData, FriendTags.blocked);
  const sortedFriends = acceptedFriends.concat(pendingFriends, blockedFriends);

  // convert sorted friends into lines
  const lines: JSX.Element[] = createFriendlistComponents(sortedFriends);

  // this should run when the component is mounted
  useEffect(() => {
    handleResize();
    focusOnInput();
    observerSetup();
  }, []);

  useEffect(() => {
    if (inputValue === "")
      setIsSearching(false);
    console.log(inputValue);
  }, [inputValue]);

  // calibrate the value of start and ending index
  useEffect(() => {
    if (maxDisplayLines > lines.length) {
      setEndingIndex(lines.length);
      setStartingIndex(0);
    }
    else
      setEndingIndex(startingIndex + maxDisplayLines - 1);
  }, [startingIndex])

  return (
    <div className='w-full h-full flex flex-col overflow-hidden text-base uppercase bg-dimshadow px-[2ch] relative' onClick={focusOnInput}>
      <input
        className='w-0 h-0 absolute'
        onKeyDown={handleKeyDown}
        onChange={handleInput}
        value={inputValue}
        ref={inputRef}
      />
      <div className='w-full h-full flex flex-col overflow-hidden' ref={divRef}>
        {
          friendsData.length === 0
            ? <EmptyFriendlist />
            : lines.slice(startingIndex, endingIndex)
        }
      </div>
      <p className={`absolute bottom-0 left-0 ${friendsData.length === 0 ? '' : 'whitespace-pre'} lowercase bg-highlight px-[1ch]`}>
        {
          (!isSearching || inputValue === "")
            ? `./usr/${userData.userName}/friends ${friendsData.length === 0 ? '' : `line [${startingIndex + 1}-${endingIndex}]/${lines.length}`}  press 'q' to quit`
            : inputValue
        }
      </p>
    </div>
  )

  function handleResize() {
    if (divRef.current) {
      const height = divRef.current.clientHeight;
      const lineHeight = 24;
      const max = Math.floor(height / lineHeight);
      setMaxDisplayLines(max);
      (max - 1 < lines.length) ? setEndingIndex(max - 1) : setEndingIndex(lines.length);
    }
  }

  function observerSetup() {
    const divElement = divRef.current as Element;
    const observer = new ResizeObserver(handleResize);

    if (divElement) {
      observer.observe(divElement);
    }
    return () => observer.unobserve(divElement);
  }

  function filterFriends(friends: FriendData[], status: string) {
    return friends.filter((friend) => friend.status.toLowerCase() === status);
  }

  function createFriendlistComponents(sortedFriends: FriendData[]) {
    let prevCategory = '';
    let targetCategory: FriendData[] = [];
    let components: JSX.Element[] = [];

    if (sortedFriends.length === 0) return [<EmptyFriendlist />];

    components.push(
      <FriendlistEmptyLine key="el0" />,
      <FriendlistTitle searchTerm={searchTerm} />
    );

    sortedFriends.map((friend) => {
      if (prevCategory !== friend.status) {

        switch (friend.status.toLowerCase()) {
          case "accepted":
            targetCategory = acceptedFriends;
            break;
          case "pending":
            targetCategory = pendingFriends;
            break;
          case "blocked":
            targetCategory = blockedFriends;
            break;
          default:
            break;
        }

        components.push(
          <FriendlistEmptyLine key={friend.status + `_el1`} />,
          <FriendlistTag key={friend.status} type={friend.status} total={targetCategory.length} searchTerm={searchTerm} />,
          <FriendlistEmptyLine key={friend.status + `_el2`} />
        );
        prevCategory = friend.status;
      }
      components.push(
        <FriendInfo
          key={friend.id}
          friend={friend}
          intraName={userData.intraName}
          searchTerm={searchTerm}
        />)
    })
    return (components);
  }

  function focusOnInput() {
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const { key } = event;
    const isLastLine = (startingIndex + maxDisplayLines > lines.length);
    const isFirstLine = startingIndex <= 0;

    // Backward one line
    if (key === "ArrowUp") {
      if (!isFirstLine) setStartingIndex(startingIndex - 1);
      return;
    }

    // Forward one line
    if (key === "ArrowDown") {
      if (!isLastLine) setStartingIndex(startingIndex + 1);
      return;
    }

    // Forward one line or Start searching
    if (key === "Enter") {
      if (inputValue === "" && !isLastLine)
        setStartingIndex(startingIndex + 1);
      else {
        setSearchTerm(inputValue.substring(1));
        console.log(`here`);
      }
      setInputValue("");
      return;
    }

    // Quit friendlist
    if (key === "q" && !isSearching) {
      setTimeout(() => onQuit(), 10);
      return;
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    let value = e.currentTarget.value;

    if (value[value.length - 1] == '\\') value += '\\';

    setInputValue(value.toLowerCase());
    if (value[0] === '/') {
      setIsSearching(true);
      return;
    }
    setInputValue("");
  }
}

export default Friendlist