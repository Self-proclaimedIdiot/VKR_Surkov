import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useSignalStore from '../components/useSignalStore';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import FormatChoiceButton from '../components/FormatChoiceButton';
const Friends = () => {
    const connection = useSignalStore((state) => state.connection);
    const { accountId } = useParams();
    const accountId_n = Number(accountId)
    const token = sessionStorage.getItem('token');
    const navigate = useNavigate();
    const [friends, setFriends] = useState([])
    const [subscribers, setSubscribers] = useState([])
    const [isOwner, setIsOwner] = useState(false)
    const [formats, setFormats] = useState([])
    const OpenUserProfile = (Id) => {
        navigate(`/user-profile/${Id}`)
    }
    const SendFriendshipInvite = (Id, index) => {
        connection.invoke("SendFriendshipInvite", Id)
        let newFriends = friends.slice()
        newFriends[index].isSubscribed = true
        setFriends(newFriends)
    }
    const SendRefuseFriendship = (Id, index) => {
        connection.invoke("SendRefuseFriendship", Id)
        let newFriends = friends.slice()
        newFriends[index].isSubscribed = false
        setFriends(newFriends)
    }
    const AcceptFriendshipInvite = (Id, index) => {
        connection.invoke("AcceptFriendshipInvite", Id)
        let newFriends = friends.slice()
        newFriends[index].isSubscribed = true
        setFriends(newFriends)
    }
    const AcceptFriendshipInviteForSubscriber = (Id, index) => {
        connection.invoke("AcceptFriendshipInvite", Id)
        let newFriends = friends.slice()
        newFriends.push({ accountId: subscribers[index].accountId, login: subscribers[index].login, isSubscribed: true, isSubscriber: true })
        let newSubscribers = subscribers.slice()
        delete newSubscribers[index]
        setFriends(newFriends)
        setSubscribers(newSubscribers)
    }
    const SendDeclineFriendshipInvite = (Id, index) => {
        connection.invoke("DeclineFriendshipInvite", Id)
        let newSubscribers = subscribers.slice()
        delete newSubscribers[index]
        setSubscribers(newSubscribers)
    }
    useEffect(() => {
        const decoded = jwtDecode(token)
        fetch('/friends/get-friends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ClientId: decoded.nameid, AccountId: accountId_n })
        })
            .then(response => response.json())
            .then(data => {
                setFriends(data.friends)
                setFormats(data.formats)
                setIsOwner(decoded.nameid == accountId)
            })
    }, [])
    useEffect(() => {
        if (isOwner) {
            const decoded = jwtDecode(token)
            fetch('/friends/get-subscribers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ClientId: decoded.nameid, AccountId: accountId_n })
            })
                .then(response => response.json())
                .then(data => {
                    setSubscribers(data.subscribers)
                })
        }
    },[isOwner])
    return (
        <div>
            {
                friends.map(friend => {
                    const decoded = jwtDecode(token)
                    return (<div>
                        <span className = "friend-login" onClick={() => OpenUserProfile(friend.accountId)}>{friend.login}</span>
                        {friend.accountId != decoded.nameid && < span  > 
                            {!friend.isSubscribed && !friend.isSubscriber && < button className="user-action-btn"
                                onClick={() => SendFriendshipInvite(friend.accountId, friends.indexOf(friend))}>
                                Добавить в друзья
                            </button>}
                            {friend.isSubscribed && friend.isSubscriber && < button className="user-action-btn"
                                onClick={() => SendRefuseFriendship(friend.accountId, friends.indexOf(friend))}>
                                Удалить из друзей
                            </button>}
                            {friend.isSubscribed && !friend.isSubscriber && < button className="user-action-btn"
                                onClick={() => SendRefuseFriendship(friend.accountId, friends.indexOf(friend))}>
                                Отозвать заявку
                            </button>}
                            {!friend.isSubscribed && friend.isSubscriber && < button className="user-action-btn"
                                onClick={() => AcceptFriendshipInvite(friend.accountId, friends.indexOf(friend))}>
                                Принять заявку
                            </button>}
                            {isOwner && <FormatChoiceButton title="Предложить игру" formats={formats} opponentId={friend.accountId}></FormatChoiceButton>}
                        </span>}
                        </div>)
                })
            }
            {isOwner && < div > Поступающие заявки в друзья:</div>}
            {
                subscribers.map(subscriber => {
                    return (
                        <div>
                            <span className="friend-login" onClick={() => OpenUserProfile(subscriber.accountId)}>{subscriber.login}</span>
                            < span  >
                                < button className="user-action-btn"
                                    onClick={() => AcceptFriendshipInviteForSubscriber(subscriber.accountId, subscribers.indexOf(subscriber))}>
                                    Принять заявку
                                </button>
                                < button className="user-action-btn"
                                    onClick={() => SendDeclineFriendshipInvite(subscriber.accountId, subscribers.indexOf(subscriber))}>
                                    Отклонить заявку
                                </button>
                            </span>
                        </div>
                    )
                })
            }
        </div>
    )
}
export default Friends