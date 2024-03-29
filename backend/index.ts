import { startServer } from "ws-server";
import { Observable } from "rxjs";
import { action } from "player/async-api/action/node";
import { getGame } from "player/async-api/get-game/node";
import { observeGame } from "player/async-api/observe-game/node";
import { getMyCharacter } from "player/async-api/get-my-character/node";
import { observeMyCharacter } from "player/async-api/observe-my-character/node";
import { Message } from "player/async-api/message";
import { Connection } from "connection-types";

const connexions$: Observable<Connection<Message>> = startServer();
action(connexions$);
getGame(connexions$);
observeGame(connexions$);
getMyCharacter(connexions$)
observeMyCharacter(connexions$);
