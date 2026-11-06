"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import GameCase from "./GameCase";

export default function GameVault({ games, onPreview }) {
  return (
    <section
      className="game-vault section page-width"
      id="game-vault"
      data-reveal
    >
      <div className="vault-heading">
        <div>
          <span className="eyebrow">THE VAULT / HANDPICKED WORLDS</span>
          <h2 id="game-vault-title" tabIndex={-1}>
            Every cover.
            <br />
            <em>Another universe.</em>
          </h2>
        </div>
        <p>
          Pick a game. Turn it around.
          <br />
          Find your next obsession.
        </p>
      </div>
      <div className="vault-stage">
        <div className="vault-floor" aria-hidden="true" />
        <div className="vault-collection">
          {games.map((game, index) => (
            <button
              className="vault-selection"
              key={game.id}
              aria-label={`Inspect ${game.name} in 3D`}
              onClick={(event) =>
                onPreview(
                  game,
                  event.currentTarget.querySelector(".game-case-stage"),
                )
              }
              style={{ "--vault-index": index, "--game-color": game.color }}
            >
              <span className="vault-index">
                0{index + 1} / {game.genre}
              </span>
              <GameCase game={game} />
              <span className="vault-game-title">
                {game.name}
                <ArrowUpRightIcon />
              </span>
              <span className="vault-invite">OPEN 3D PREVIEW</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
