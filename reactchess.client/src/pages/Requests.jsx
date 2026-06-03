import ReactDOM from 'react-dom';
import { useState, useEffect } from "react";
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
const Requests = () => {
    const [requests, setRequests] = useState([])
    const token = sessionStorage.getItem('token');
    const navigate = useNavigate();
    const OpenUserProfile = (Id) => {
        navigate(`/user-profile/${Id}`)
    }
    const RemoveRequest = (id) => {
        const newRequests = requests.filter(request => request.id != id)
        setRequests(newRequests)
    }
    const SendTitle = (requestId, petitionerId, title) => {
        fetch('/requests/give-title', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ RequestId: requestId, PetitionerId: petitionerId, Title: title })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Титул выдан!", {
                        duration: 2000,
                    });
                    RemoveRequest(requestId)
                }
            })
    }
    const DeclineRequest = (requestId) => {
        fetch('/requests/decline-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ RequestId: requestId })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Запрос отклонен!", {
                        duration: 2000,
                    });
                    RemoveRequest(requestId)
                }
            })
    }
    useEffect(() => {
        fetch('/requests/get-requests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(data => {
                setRequests(data.requests)
            })
    }, [])
    return (
        <div className="page-container">
            <div className="reports-list">
                {requests.map(request => {
                    return (<div className="report-card">
                        <div className = "report=header">
                            <span onClick={() => OpenUserProfile(request.petitionerId)}>{request.petitionerLogin}</span>  {"(" + request.petitionerElo + ") просит присвоить титул " + request.title + " по основанию: "}
                            <p className="report-text">{request.info}</p>
                        </div>
                        <div className="report-actions">
                            <button className= "btn btn-secondary"onClick={() => SendTitle(request.id, request.petitionerId, request.valueTitle)}>Присвоить</button>
                            <button className="btn btn-secondary" onClick={() => DeclineRequest(request.id)}>Отклонить</button>
                        </div>
                </div>)
            })}
            </div>
        </div>
    )
}
export default Requests