import ReactDOM from 'react-dom';
const TransformationModal = ({ isOpen, isWhite, onClose, onSelect}) => {
    // Если модалка закрыта — ничего не выводим
    if (!isOpen) return null;
    // Используем Portal, чтобы модалка была на самом верхнем уровне DOM
    return ReactDOM.createPortal(
        <div className="overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Выберите, в какую фигуру вы хотите превратить пешку</h2>
                <img onClick={() => {onSelect('n', isWhite ? 'w' : 'b'); onClose() }} src={"/pieces/Chess_n" + (isWhite ? "l" : "d") + "t45.svg"} />
                <img onClick={() => {onSelect('b', isWhite ? 'w' : 'b'); onClose() }} src={"/pieces/Chess_b" + (isWhite ? "l" : "d") + "t45.svg"} />
                <img onClick={() => {onSelect('r', isWhite ? 'w' : 'b'); onClose() }} src={"/pieces/Chess_r" + (isWhite ? "l" : "d") + "t45.svg"} />
                <img onClick={() => {onSelect('q', isWhite ? 'w' : 'b'); onClose() }} src={"/pieces/Chess_q" + (isWhite ? "l" : "d") + "t45.svg"} />
            </div>
        </div>,
        document.body // Рендерим прямо в body
    );
};
export default TransformationModal