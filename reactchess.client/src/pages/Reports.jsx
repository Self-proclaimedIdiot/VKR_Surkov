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
        <div className="page-container">
            <div className="reports-list">
            {
                reports.map(report => {
                    return (
                        <div className="report-card">
                            <div className = "report-header">
                                <span onClick={() => OpenUserProfile(report.reporterId)}>{report.reporterLogin}</span>  → 
                                <span onClick={() => OpenUserProfile(report.accusedId)}>{report.accusedLogin} </span>
                            </div>
                            <p className="report-text"> {report.text} </p>
                            <div className="report-actions">
                            <BanOptionsButton title="Забанить" accusedId={report.accusedId} reportId={report.id} onBan={() => RemoveReport(report.id)}>
                            </BanOptionsButton>
                            <button className="btn btn-secondary btn-sm" onClick={() => DeclineReport(report.id)}>Отклонить</button>
                            {report.gameId != 0 &&
                            < button className="btn btn-secondary btn-sm" onClick={() => OpenGameReplay(report.gameId, report.accusedId)} >Открыть партию</button>}
                            </div>
                        </div>
                ) })
                }
            </div>
        </div>
    )
}
export default Reports