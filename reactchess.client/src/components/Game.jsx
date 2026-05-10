const PieceType = {
    PAWN: 'p',
    KNIGHT: 'n',
    BISHOP: 'b',
    ROOK: 'r',
    QUEEN: 'q',
    KING: 'k'
};

const Color = {
    WHITE: 'w',
    BLACK: 'b'
};
class Piece {
    constructor(type, color, hasMoved = false) {
        this.type = type;
        this.color = color;
        this.hasMoved = hasMoved;
    }
    getSprite() {
        const othercolor = this.color == 'w' ?'l':'d'
        const sprite = 'Chess_' + this.type + othercolor + 't45.svg'
        return sprite;
    }
    GetColorMultiplier() {
        return this.color == 'w' ? -1 : 1
    }
    GetCost() {
        switch (this.type) {
            case 'p':
                return 1
            case 'n':
                return 3
            case 'b':
                return 3
            case 'r':
                return 5
            case 'q':
                return 9
        }
    }
}
class ChessBoard {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = Color.WHITE;
        this.enPassantTarget = null;
        this.castlingRights = {
            [Color.WHITE]: { kingSide: true, queenSide: true },
            [Color.BLACK]: { kingSide: true, queenSide: true }
        };
        this.counerToDraw = 0;
        this.moveNumber = 1;
    }

    GetCoordsFromNotation(note) {
        if (note != '-') {
            return [8 - note[1], note[0].charCodeAt(0) - 97]
        }
        else return null
    }
    GetNotationFromCoords(coords) {
        const column = String.fromCharCode(coords[1] + 97)
        const row = 9-(coords[0] + 1)
        return column + row
    }
    ReadFromFEN(fen) {
        for (let i = 0; i < 8; i++)
            for (let j = 0; j < 8; j++)
                this.board[i][j] = null
        const [piecePlacement, activeColor, castling, enPassant, draw, move] = fen.split(' ');
        const rows = piecePlacement.split('/')
        for (let i = 0; i < 8; i++) {
            let skip = 0
            const chars = rows[i].split('')
            chars.map((char) => {
                if (/^\d+$/.test(char)) {
                    this.board[i][skip] = null
                    skip += parseInt(char)
                }
                else {
                    this.board[i][skip] = new Piece(char.toLowerCase(), char.toUpperCase() == char ? 'w' : 'b', false)
                    skip += 1
                }
            })
        }
        this.currentPlayer = activeColor
        this.castlingRights['w'].kingSide = castling.includes('K')
        this.castlingRights['w'].queenSide = castling.includes('Q')
        this.castlingRights['b'].kingSide = castling.includes('k')
        this.castlingRights['b'].queenSide = castling.includes('q')
        this.enPassantTarget = this.GetCoordsFromNotation(enPassant)
        this.counerToDraw = Number(draw)
        this.moveNumber = Number(move)
    }
    WriteToFEN() {
        let fen = ""
        for (let i = 0; i < 8; i++) {
            let row = ""
            let number = 0
            for (let j = 0; j < 8; j++) {
                if (this.board[i][j] != null) {
                    if (number > 0) {
                        row += number
                        number = 0
                    }
                    row += this.board[i][j].color == 'w' ? this.board[i][j].type.toUpperCase() : this.board[i][j].type
                }
                else number++
            }
            if (number > 0)
                row += number
            row += '/'
            fen += row
        }
        fen = fen.slice(0,-1)
        fen += (" " + this.currentPlayer)
        let castling = ""
        const colors = ['w','b']
        colors.map((color) => {
            castling += this.castlingRights[color].kingSide ? (color == 'w' ? 'K' : 'k') : ''
            castling += this.castlingRights[color].queenSide ? (color == 'w' ? 'Q' : 'q') : ''
        })
        if (castling == "")
            castling = "-"
        fen += (" " + castling)
        let enPassant = "-"
        if (this.enPassantTarget != null) {
            enPassant = this.GetNotationFromCoords(this.enPassantTarget)
        }
        fen += (" " + enPassant)
        fen += (" " + this.counerToDraw)
        fen += (" " + this.moveNumber)
        return fen
    }
    TransformPiece(type, color, dest){
        this.board[dest[0]][dest[1]] = new Piece(type, color)
        if (this.IsCheck(color) && this.CanMove(this.currentPlayer))
            return "Check"
        else if (this.IsCheck(color) && !this.CanMove(this.currentPlayer))
            return "Checkmate"
        else if (!this.IsCheck(color) && !this.CanMove(this.currentPlayer))
            return "Stalemate"
        else if (this.counerToDraw >= 50)
            return "Draw50"
        else if (this.CheckForNoMaterial())
            return "NoMaterial"
        else return "MoveDone"
    }
    PawnMoves(piece, loc) {
        let moves = []
        if (loc[0] != 3.5 + piece.GetColorMultiplier() * 3.5) {
            if (this.board[loc[0] + piece.GetColorMultiplier()][loc[1]] == null) {
                moves.push([loc[0] + piece.GetColorMultiplier(), loc[1]])
                if (loc[0] == 3.5 - 2.5 * piece.GetColorMultiplier() &&
                    this.board[loc[0] + 2 * piece.GetColorMultiplier()][loc[1]] == null) {
                    moves.push([loc[0] + 2 * piece.GetColorMultiplier(), loc[1]])
                    //this.enPassantTarget = [loc[0] + piece.GetColorMultiplier(), loc[1]]
                }
            }
            const enPassantPlaceholder = this.enPassantTarget == null ? [9, 9] : this.enPassantTarget
            if (loc[1] < 7)
                if (this.board[loc[0] + piece.GetColorMultiplier()][loc[1] + 1] != null &&
                    this.board[loc[0] + piece.GetColorMultiplier()][loc[1] + 1]?.color != piece.color ||
                    loc[0] + piece.GetColorMultiplier() == enPassantPlaceholder[0] &&
                    loc[1] + 1 == enPassantPlaceholder[1])
                    moves.push([loc[0] + piece.GetColorMultiplier(), loc[1] + 1])
            if (loc[1] > 0)
                if (this.board[loc[0] + piece.GetColorMultiplier()][loc[1] - 1] != null &&
                    this.board[loc[0] + piece.GetColorMultiplier()][loc[1] - 1]?.color != piece.color ||
                    loc[0] + piece.GetColorMultiplier() == enPassantPlaceholder[0] &&
                    loc[1] - 1 == enPassantPlaceholder[1])
                    moves.push([loc[0] + piece.GetColorMultiplier(), loc[1] - 1])
        }
        return moves
    }
    KnightMoves(piece, loc) {
        let moves = []
        const knightLong = [-2, 2]
        const knightShort = [-1, 1]
        for (let i = 0; i <= 1; i++)
            for (let j = 0; j <= 1; j++) {
                if (loc[0] + knightLong[i] >= 0 && loc[0] + knightLong[i] <= 7 &&
                    loc[1] + knightShort[j] >= 0 && loc[1] + knightShort[j] <= 7)
                    if (this.board[loc[0] + knightLong[i]][loc[1] + knightShort[j]]?.color != piece.color)
                        moves.push([loc[0] + knightLong[i], loc[1] + knightShort[j]])
                if (loc[0] + knightShort[j] >= 0 && loc[0] + knightShort[j] <= 7 &&
                    loc[1] + knightLong[i] >= 0 && loc[1] + knightLong[i] <= 7)
                    if (this.board[loc[0] + knightShort[j]][loc[1] + knightLong[i]]?.color != piece.color)
                        moves.push([loc[0] + knightShort[j], loc[1] + knightLong[i]])
            }
        return moves
    }
    BishopMoves(piece, loc) {
        let moves = []
        for (let i = -1; i <= 1; i += 2)
            for (let j = -1; j <= 1; j += 2) {
                let mul = 1
                while (loc[0] + i * mul >= 0 && loc[0] + i * mul <= 7 &&
                    loc[1] + j * mul >= 0 && loc[1] + j * mul <= 7) {
                    if (this.board[loc[0] + i * mul][loc[1] + j * mul] == null) {
                        moves.push([loc[0] + i * mul, loc[1] + j * mul])
                    }
                    else {
                        if (this.board[loc[0] + i * mul][loc[1] + j * mul].color != piece.color) {
                            moves.push([loc[0] + i * mul, loc[1] + j * mul])
                        }
                        break;
                    }
                    mul++
                }
            }
        return moves
    }
    RookMoves(piece, loc) {
        let moves = []
        for (let i = -1; i <= 1; i += 2) {
            let mul = 1
            while (loc[0] + i * mul >= 0 && loc[0] + i * mul <= 7) {
                if (this.board[loc[0] + i * mul][loc[1]] == null) {
                    moves.push([loc[0] + i * mul, loc[1]])
                }
                else {
                    if (this.board[loc[0] + i * mul][loc[1]].color != piece.color) {
                        moves.push([loc[0] + i * mul, loc[1]])
                    }
                    break;
                }
                mul++
            }
            mul = 1
            while (loc[1] + i * mul >= 0 && loc[1] + i * mul <= 7) {
                if (this.board[loc[0]][loc[1] + i * mul] == null) {
                    moves.push([loc[0], loc[1] + i * mul])
                }
                else {
                    if (this.board[loc[0]][loc[1] + i * mul].color != piece.color) {
                        moves.push([loc[0], loc[1] + i * mul])
                    }
                    break;
                }
                mul++
            }
        }
        return moves
    }
    QueenMoves(piece, loc) {
        let moves = []
        this.BishopMoves(piece, loc).map((move) => moves.push(move))
        this.RookMoves(piece, loc).map((move) => moves.push(move))
        return moves
    }
    KingMoves(piece, loc) {
        let moves = []
        for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++) {
                if (loc[0] + i >= 0 && loc[0] + i <= 7 &&
                    loc[1] + j >= 0 && loc[1] + j <= 7) {
                    if (this.board[loc[0] + i][loc[1] + j]?.color != piece.color) 
                        moves.push([loc[0] + i, loc[1] + j])
                }
            }
        if (this.castlingRights[piece.color].kingSide) {
            if (this.board[loc[0]][loc[1] + 1] == null &&
                this.board[loc[0]][loc[1] + 2] == null &&
                this.board[loc[0]][loc[1] + 3]?.type == 'r') {
                let enemyPieces = this.GetAllColorPieces(piece.color == 'w' ? 'b' : 'w')
                if (this.castlingRights[piece.color == 'w' ? 'b' : 'w'].kingSide ||
                    this.castlingRights[piece.color == 'w' ? 'b' : 'w'].queenSide)
                    enemyPieces = enemyPieces.filter(piece => piece.type != 'k')
                let pass = true
                enemyPieces.map((data => {
                    const ePiece = data[0]
                    const eLoc = [data[1], data[2]]
                    const eMoves = this.GetMoves(ePiece, eLoc, false)
                    eMoves.map((move) => pass = (move[0] == loc[0] && (move[1] == loc[1] ||
                                                                      move[1] == loc[1] + 1 ||
                                                                      move[1] == loc[1] + 2) ? false : pass))
                }))
                if (pass)
                    moves.push([loc[0], loc[1] + 3])
            }
        }
        if (this.castlingRights[piece.color].queenSide) {
            if (this.board[loc[0]][loc[1] - 1] == null &&
                this.board[loc[0]][loc[1] - 2] == null &&
                this.board[loc[0]][loc[1] - 3] == null &&
                this.board[loc[0]][loc[1] - 4]?.type == 'r') {
                let enemyPieces = this.GetAllColorPieces(piece.color == 'w' ? 'b' : 'w')
                if (this.castlingRights[piece.color == 'w' ? 'b' : 'w'].kingSide ||
                    this.castlingRights[piece.color == 'w' ? 'b' : 'w'].queenSide)
                    enemyPieces = enemyPieces.filter(piece => piece.type != 'k')
                let pass = true
                enemyPieces.map((data => {
                    const ePiece = data[0]
                    const eLoc = [data[1], data[2]]
                    const eMoves = this.GetMoves(ePiece, eLoc, false)
                    eMoves.map((move) => pass = (move[0] == loc[0] && (move[1] == loc[1] ||
                        move[1] == loc[1] - 1 ||
                        move[1] == loc[1] - 2) ? false : pass))
                }))
                if(pass)
                    moves.push([loc[0], loc[1] - 4])
            }
        }
        return moves
    }
    GetAllColorPieces(color) {
        let pieces = []
        for (let i = 0; i < 8; i++)
            for (let j = 0; j < 8; j++)
                if (this.board[i][j]?.color == color)
                    pieces.push([this.board[i][j], i, j])
        return pieces
    }
    GetAllMissings() {
        const whites = this.GetAllColorPieces('w')
        const blacks = this.GetAllColorPieces('b')
        let pawns = [0, 0]
        let knights = [0, 0]
        let bishops = [0, 0]
        let rooks = [0, 0]
        let queens = [0, 0]
        whites.map((piece) => {
            switch (piece[0].type) {
                case 'p':
                    pawns[0]++
                    break
                case 'n':
                    knights[0]++
                    break
                case 'b':
                    bishops[0]++
                    break
                case 'r':
                    rooks[0]++
                    break
                case 'q':
                    queens[0]++
                    break
            }
        });
        blacks.map((piece) => {
            switch (piece[0].type) {
                case 'p':
                    pawns[1]++
                    break
                case 'n':
                    knights[1]++
                    break
                case 'b':
                    bishops[1]++
                    break
                case 'r':
                    rooks[1]++
                    break
                case 'q':
                    queens[1]++
                    break
            }
        });
        let missings = []
        const missing_pawns = [8 - pawns[0], 8 - pawns[1]]
        const missing_knights = [2 - knights[0], 2 - knights[1]]
        const missing_bishops = [2 - bishops[0], 2 - bishops[1]]
        const missing_rooks = [2 - rooks[0], 2 - rooks[1]]
        const missing_queens = [1 - queens[0], 1 - queens[1]]
        for (let i = 0; i < missing_pawns[0]; i++)
            missings.push(new Piece('p', 'w', false))
        for (let i = 0; i < missing_knights[0]; i++)
            missings.push(new Piece('n', 'w', false))
        for (let i = 0; i < missing_bishops[0]; i++)
            missings.push(new Piece('b', 'w', false))
        for (let i = 0; i < missing_rooks[0]; i++)
            missings.push(new Piece('r', 'w', false))
        for (let i = 0; i < missing_queens[0]; i++)
            missings.push(new Piece('q', 'w', false))
        for (let i = 0; i < missing_pawns[1]; i++)
            missings.push(new Piece('p', 'b', false))
        for (let i = 0; i < missing_knights[1]; i++)
            missings.push(new Piece('n', 'b', false))
        for (let i = 0; i < missing_bishops[1]; i++)
            missings.push(new Piece('b', 'b', false))
        for (let i = 0; i < missing_rooks[1]; i++)
            missings.push(new Piece('r', 'b', false))
        for (let i = 0; i < missing_queens[1]; i++)
            missings.push(new Piece('q', 'b', false))
        return missings
     }
    GetMoves(piece, loc, withKingRisks){
        let moves = []
            switch (piece.type) {
                case 'p':
                    this.PawnMoves(piece, loc).map((move) => moves.push(move))
                    break;
                case 'n':
                    this.KnightMoves(piece, loc).map((move) => moves.push(move))
                    break;
                case 'b':
                    this.BishopMoves(piece, loc).map((move) => moves.push(move))
                    break;
                case 'r':
                    this.RookMoves(piece, loc).map((move) => moves.push(move))
                    break;
                case 'q':
                    this.QueenMoves(piece, loc).map((move) => moves.push(move))
                    break;
                case 'k':
                    this.KingMoves(piece, loc).map((move) => moves.push(move))
                    
        }
        if (withKingRisks)
        moves = moves.filter((move) => !this.DoesRevealKing(loc,move))
        return moves
    };
    DoesRevealKing(loc, dest) {
        const piece = this.board[loc[0]][loc[1]]
        const victim = this.board[dest[0]][dest[1]]
        if (victim?.color == piece.color && victim?.type == 'r')
            return false
        this.board[loc[0]][loc[1]] = null
        this.board[dest[0]][dest[1]] = piece
        const enemyPieces = this.GetAllColorPieces(piece.color == 'w' ? 'b' : 'w')
        let res = false
        enemyPieces.map((data) => {
            const ePiece = data[0]
            const eLoc = [data[1], data[2]]
            const moves = this.GetMoves(ePiece, eLoc, false)
            moves.map((move) => res = (this.board[move[0]][move[1]]?.type == 'k' &&
                this.board[move[0]][move[1]]?.color == piece.color) ? true : res)
        })
        this.board[loc[0]][loc[1]] = piece
        this.board[dest[0]][dest[1]] = victim
        return res
    }
    IsMoveLegal(piece, loc, dest){
        const moves = this.GetMoves(piece, loc, true)
        let res = false
        moves.map((move) => res = (move[0] == dest[0] && move[1] == dest[1]) ? true : res)
        return res
    };
    IsCheck(color) {
        const allyPieces = this.GetAllColorPieces(color)
        let res = false
        allyPieces.map((data) => {
            const aPiece = data[0]
            const aLoc = [data[1], data[2]]
            const moves = this.GetMoves(aPiece, aLoc, false)
            moves.map((move) => res = (this.board[move[0]][move[1]]?.type == 'k' &&
                this.board[move[0]][move[1]]?.color != color) ? true : res) 
        })
        return res
    }
    CanMove(color) {
        const allyPieces = this.GetAllColorPieces(color)
        let res = false
        allyPieces.map((data) => {
            const aPiece = data[0]
            const aLoc = [data[1], data[2]]
            const moves = this.GetMoves(aPiece, aLoc, true)
            res = moves.length > 0 ? true : res
        })
        return res
    }
    CheckForNoMaterial() {
        const whitePieces = this.GetAllColorPieces('w')
        const blackPieces = this.GetAllColorPieces('b')
        if (whitePieces.length == 1 && blackPieces.length == 1)
            return true
        if (whitePieces.length == 2 && blackPieces.length == 1) {
            let hasKnight = false;
            let hasBishop = false;
            whitePieces.map(p => {
                hasKnight = p[0].type == 'n' ? true : hasKnight
                hasBishop = p[0].type == 'b' ? true : hasBishop
            })
            return hasKnight || hasBishop
        }
        else if (whitePieces.length == 1 && blackPieces.length == 2) {
            let hasKnight = false;
            let hasBishop = false;
            blackPieces.map(p => {
                hasKnight = p[0].type == 'n' ? true : hasKnight
                hasBishop = p[0].type == 'b' ? true : hasBishop
            })
            return hasKnight || hasBishop
        }
        else if (whitePieces.length == 2 && blackPieces.length == 2) {
            let whiteBishopColor = -1
            let blackBishopColor = -1
            whitePieces.map(p => whiteBishopColor = p[0].type == 'b' ? (p[1] + p[2]) % 2 : whiteBishopColor)
            blackPieces.map(p => blackBishopColor = p[0].type == 'b' ? (p[1] + p[2]) % 2 : blackBishopColor)
            return whiteBishopColor == blackBishopColor && whiteBishopColor != -1
        }
        return false
    }
    MakeMove(loc, dest) {
        const piece = this.board[loc[0]][loc[1]]
        if (this.IsMoveLegal(piece, loc, dest)) {
            //увеличиваем счетчики, если ходили черные (они последними ходят не просто так)
            if (piece.color == 'b') {
                this.moveNumber++
                this.counerToDraw++
            }
            this.counerToDraw = this.board[dest[0]][dest[1]] == null ? this.counerToDraw : 0
            //снимаем рокировочку
            if (piece.type == 'k') {
                this.castlingRights[piece.color].kingSide = false
                this.castlingRights[piece.color].queenSide = false
            }
            if (piece.type == 'r') {
                if (loc[0] == 7)
                    this.castlingRights[piece.color].kingSide = false
                if (loc[0] == 0)
                    this.castlingRights[piece.color].queenSide = false
            }
            //реализуем рокировочку
            if (piece.type == 'k' && loc[1] == 4 &&
                this.board[dest[0]][dest[1]]?.color == piece.color &&
                this.board[dest[0]][dest[1]]?.type == 'r') {
                this.board[loc[0]][loc[1]] = null
                this.board[dest[0]][dest[1]] = null
                if (dest[1] == 7) {
                    this.board[loc[0]][6] = piece
                    this.board[loc[0]][5] = new Piece('r', piece.color)
                }
                else if (dest[1] == 0) {
                    this.board[loc[0]][2] = piece
                    this.board[loc[0]][3] = new Piece('r', piece.color)
                }
            }
            else {
                //взятие на проходе
                if (piece.type == 'p' &&
                    this.board[dest[0]][dest[1]] == null &&
                    this.board[dest[0] - piece.GetColorMultiplier()][dest[1]]?.type == 'p' &&
                    this.board[dest[0] - piece.GetColorMultiplier()][dest[1]]?.color != piece.color) {
                    this.board[dest[0] - piece.GetColorMultiplier()][dest[1]] = null
                    this.enPassantTarget = null
                }
                //записываем проходное поле
                if (piece.type == 'p' && loc[0] + 2 * piece.GetColorMultiplier() == dest[0]) {
                    this.enPassantTarget = [loc[0] + piece.GetColorMultiplier(), loc[1]]
                }
                else this.enPassantTarget = null
                //обычный ход
                this.board[loc[0]][loc[1]] = null
                this.board[dest[0]][dest[1]] = piece
            }
            this.currentPlayer = this.currentPlayer == 'w' ? 'b' : 'w'
            if (this.IsCheck(piece.color) && this.CanMove(this.currentPlayer))
                return "Check"
            else if (this.IsCheck(piece.color) && !this.CanMove(this.currentPlayer))
                return "Checkmate"
            else if (!this.IsCheck(piece.color) && !this.CanMove(this.currentPlayer))
                return "Stalemate"
            else if (this.counerToDraw >= 50)
                return "Draw50"
            else if (this.CheckForNoMaterial())
                return "NoMaterial"
            else if (piece.type == 'p' && dest[0] == 3.5 + piece.GetColorMultiplier() * 3.5)
                return "Tranformation"
            else return "MoveDone"
        }
        else return "NotLegal"
    }
}
export default ChessBoard