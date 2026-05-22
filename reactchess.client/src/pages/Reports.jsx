import ReactDOM from 'react-dom';
import { useState, useEffect } from "react";
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import BanOptionsButton from '../components/BanOptionsButton';
//import { jwtDecode } from "jwt-decode";
const Reports = () => {
    const [reports, setReports] = useState([])
    const token = sessionStorage.getItem('token');
    const navigate = useNavigate();
    const OpenUserProfile = (Id) => {
        navigate(`/user-profile/${Id}`)
    }
    const OpenGameReplay = (gameId, accountId) => {
        navigate(`/replay/${gameId}/${accountId}`)
    }
    const RemoveReport = (id) => {
        const newReports = reports.filter(report => report.id != id)
        setReports(newReports)
    }
    const DeclineReport = (reportId) => {
        fetch('/reports/decline-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ReportId: reportId })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Жалоба отклонена!", {
                        duration: 2000,
                    });
                    RemoveReport(reportId)
                }
            })
    }
    useEffect(() => {
        fetch('/reports/get-reports', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(data => {
                setReports(data.reports)
            })
    }, [])
    return (
        <div>
            {
                reports.map(report => {
                    return (
                        <div>
                            <span onClick={() => OpenUserProfile(report.accusedId)}>{report.accusedLogin} </span> обвиняется в
                            <span> {report.text} </span> жалобу прислал:
                            <span onClick={() => OpenUserProfile(report.reporterId)}>{report.reporterLogin}</span>
                            <BanOptionsButton title="Заблокировать" accusedId={report.accusedId} reportId={report.id} onBan={() => RemoveReport(report.id)}>
                            </BanOptionsButton>
                            <button className="user-action-btn" onClick={() => DeclineReport(report.id)}>Отклонить</button>
                            {report.gameId != 0 &&
                                < button className="user-action-btn" onClick={() => OpenGameReplay(report.gameId, report.accusedId)} >Открыть партию</button>}
                        </div>
                ) })
            }
        </div>
    )
}
export default Reports