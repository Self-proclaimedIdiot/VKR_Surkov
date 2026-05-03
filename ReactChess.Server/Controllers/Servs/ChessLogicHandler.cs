namespace ReactChess.Server.Controllers.Servs
{
    public class ChessLogicHandler
    {
        public bool FENEqual(string FEN1, string FEN2)
        {
            string[] splited1 = FEN1.Split(' ');
            string[] splited2 = FEN2.Split(' ');
            return splited1[0] == splited2[0] &&
                   splited1[1] == splited2[1] &&
                   splited1[2] == splited2[2] &&
                   splited1[3] == splited2[3];
        }
        public string ColorFromFEN(string FEN)
        {
            return FEN.Split(' ')[1];
        }
        public string ColorOfPiece(string piece)
        {
            if (piece == null)
                return null;
            return piece.ToUpper() == piece ? "w" : "b";
        }
        public int ColorMultiplier(string color)
        {
            return color == "w" ? -1 : 1;
        }
        public bool[] GetCastling(string castlingFEN, string color)
        {
            return [castlingFEN.Contains(color == "w" ? 'K' : 'k'),
                    castlingFEN.Contains(color == "w" ? 'Q' : 'q')];
        }
        public string[,] DecodeFEN(string FEN)
        {
            string[,] res = new string[8, 8];
            string[] board = FEN.Split(" ")[0].Split("/");
            for (int i = 0; i < 8; i++)
            {
                int skip = 0;
                foreach (char square in board[i])
                {
                    if (Char.IsDigit(square))
                    {
                        res[i, skip] = null;
                        skip += Convert.ToInt32(square) - 48;
                    }
                    else
                    {
                        res[i, skip] = square.ToString();
                        skip++;
                    }
                }
            }
            return res;
        }
        public string GetNotation(string type, int row, int column)
        {
            char note_column = Convert.ToChar(column + 97);
            int note_row = 8 - row;
            string char_type = (type == "p" || type == "P") ? "" : type.ToUpper();
            return char_type + note_column + note_row;
        }
        public int[] GetCoords (string note)
        {
            int[] coords = new int[2];
            coords[0] = 8 - ((int)note[1] - 48);
            coords[1] = (int)note[0] - 97;
            return coords;
        }
        private struct PieceWithCords
        {
            public string type;
            public int row;
            public int column;
        }
        private bool ArePiecesTheSame(List<PieceWithCords> pieces1, List<PieceWithCords> pieces2)
        {
            List<PieceWithCords> copies = new List<PieceWithCords>(pieces2);
            foreach (var piece in pieces1)
            {
                PieceWithCords tobe_removed = new PieceWithCords() { type = "none" };
                foreach (var copy in copies)
                {
                    if (copy.type == piece.type)
                    {
                        tobe_removed = copy;
                        break;
                    }
                }
                if (tobe_removed.type != "none")
                    copies.Remove(tobe_removed);
                else return false;
            }
            return true;
        }
        //должно выдавать кем и куда походил игрок, а в случае если игрок совершил "фокусы", выдавать о том сообщение
        public string CheckFEN(string FEN_before, string FEN_after)
        {
            string res = "";
            string[,] board_before = DecodeFEN(FEN_before);
            string[,] board_after = DecodeFEN(FEN_after);
            string color = ColorFromFEN(FEN_before);
            bool[] castling_rights = GetCastling(FEN_before.Split(' ')[2], color);
            string castling_type = "None";
            string enpassant = FEN_before.Split(' ')[3];
            int[] enpassant_square = enpassant == "-" ? [-1, -1] : GetCoords(enpassant);
            List<PieceWithCords> missings = new List<PieceWithCords>();
            List<PieceWithCords> newbies = new List<PieceWithCords>();
            for (int i = 0; i < 8; i++)
                for (int j = 0; j < 8; j++)
                {
                    //если че-то поменялось
                    if (board_before[i, j] != board_after[i, j])
                    {
                        //если на пустом или вражеском месте появилась наша фигура
                        if ((board_before[i, j] == null || ColorOfPiece(board_before[i, j]) != color) && ColorOfPiece(board_after[i, j]) == color)
                        {
                            newbies.Add(new PieceWithCords() { type = board_after[i, j], row = i, column = j });
                            //а не рокировка ли это?
                            if (newbies.Count == 2)
                            {
                                if (castling_rights[0] && (board_after[i, j].ToLower() == "k" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 6 ||
                                    board_after[i, j].ToLower() == "r" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 5))
                                {
                                    castling_type = "0-0";
                                }
                                else if (castling_rights[1] && (board_after[i, j].ToLower() == "k" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 2 ||
                                    board_after[i, j].ToLower() == "r" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 3))
                                {
                                    castling_type = "0-0-0";
                                }
                                //нет не рокировка
                                else return "Verification failed";
                            }
                            else if (newbies.Count > 2)
                                return "Verification failed";
                        }
                        //если наша фигура пропала
                        else if (ColorOfPiece(board_before[i, j]) == color && board_after[i, j] == null)
                        {
                            missings.Add(new PieceWithCords() { type = board_before[i, j], row = i, column = j });
                            //а не рокировка ли это?
                            if (missings.Count == 2)
                            {
                                if (!(castling_rights[0] && (board_before[i, j].ToLower() == "k" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 4 ||
                                    board_before[i, j].ToLower() == "r" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 7) ||
                                    castling_rights[1] && (board_before[i, j].ToLower() == "k" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 4 ||
                                    board_before[i, j].ToLower() == "r" && i == 3.5 - ColorMultiplier(color) * 3.5 && j == 0)))
                                {
                                    return "Verification failed";
                                }
                            }
                            else if (newbies.Count > 2)
                                return "Verification failed";
                        }
                        //если вражеская фигура внезапно возникла
                        else if (ColorOfPiece(board_after[i, j]) != color && board_after[i, j] != null) {
                            return "Verification failed";
                        }
                        //если вражеская фигура пропала
                        else if (ColorOfPiece(board_before[i, j]) != color && board_after[i, j] == null)
                        {
                            //а не взятие ли это на проходе?
                            if (!(board_before[i, j].ToLower() == "p" && board_after[i + ColorMultiplier(color), j].ToLower() == "p" &&
                                ColorOfPiece(board_after[i + ColorMultiplier(color), j]) == color &&
                                enpassant_square[0] == i + ColorMultiplier(color) && enpassant_square[1] == j))
                                return "Verification failed";
                        }
                    }
                }
            if (newbies.Count == 1 && missings.Count == 1 &&
                missings[0].type.ToLower() == "p" && newbies[0].type.ToLower() != "p" && newbies[0].type.ToLower() != "k" &&
                (missings[0].row == 1 || missings[0].row == 6))
                return GetNotation("p", newbies[0].row, newbies[0].column) + "=" + newbies[0].type.ToUpper();
            if (ArePiecesTheSame(newbies, missings))
            {
                if (castling_type == "None")
                    return GetNotation(newbies[0].type, newbies[0].row, newbies[0].column);
                else return castling_type;
            }
            return "Verification failed";
        }
    }
}
