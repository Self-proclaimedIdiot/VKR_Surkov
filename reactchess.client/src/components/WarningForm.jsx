import ReactDOM from 'react-dom';
import { useBlocker } from "react-router-dom";

function WarningForm({ isDirty }) {
    // Блокируем переход, если есть несохраненные изменения
    let blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );
    if (blocker.state != "blocked") return null
    return ReactDOM.createPortal(
        <div className="overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()}>
            {blocker.state === "blocked" ? (
                <div className="modal">
                    <p>Выход из партии засчитается как автоматическое поражение. Вы действительно хоите выйти?</p>
                    <button onClick={() => blocker.proceed()}>Да</button>
                    <button onClick={() => blocker.reset()}>Нет, остаться</button>
                </div>
                ) : null}
            </div>
        </div>,
        document.body
    );
}
export default WarningForm