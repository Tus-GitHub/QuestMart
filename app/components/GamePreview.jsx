"use client";
import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import GameWorldPreview from "./GameWorldPreview";
import GameInspection from "./GameInspection";
import useCinematicDialog from "./useCinematicDialog";
import { MotionToggle } from "./ExperienceSurface";
import Media from "./Media";
import { money, readable } from "@/lib/client-api.mjs";
import "../inspection.css";

export default function GamePreview(props) {
  return <GameWorldPreview {...props} />;
}

export function ListingPreview({ item, origin, onClose }) {
  const { flight, open, close, leaving } = useCinematicDialog(origin, onClose);
  return (
    <Dialog
      label={item.title}
      wide
      className={`inspection-dialog listing-inspection ${leaving ? "inspection-leaving" : ""}`}
      onOpen={open}
      onClose={close}
      footer={
        <>
          <div className="preview-purchase">
            <div className="preview-price">
              <span>SELLER’S ASKING PRICE</span>
              <strong>{money(item.price_paise)}</strong>
            </div>
            <Link
              className="button primary"
              href={`/listings/${item.id}`}
              onClick={onClose}
            >
              View listing <ArrowUpRightIcon />
            </Link>
          </div>
          <p className="preview-disclosure">
            A physical copy from another player. Review the seller’s photos and
            details before checkout.
          </p>
        </>
      }
    >
      <div className="inspection-backdrop" aria-hidden="true">
        <Media src={item.photos[0]} alt="" sizes="100vw" />
        <div />
      </div>
      <div className="inspection-topline">
        <span>THE EXCHANGE / CLOSER LOOK</span>
        <MotionToggle />
      </div>
      <div className="inspection-layout">
        <div className="inspection-flight" ref={flight}>
          <GameInspection
            photos={item.photos}
            title={item.title}
            leaving={leaving}
          />
        </div>
        <div className="inspection-brief">
          <span className="inspection-eyebrow">
            {item.platform} / PLAYER LISTING
          </span>
          <h2>{item.title}</h2>
          <p className="inspection-seller">
            <span aria-hidden="true">{item.seller_name[0].toUpperCase()}</span>
            Listed by @{item.seller_name}
          </p>
          <p className="inspection-description">{item.description}</p>
          <dl className="inspection-facts">
            <div>
              <dt>Platform</dt>
              <dd>{item.platform}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{readable(item.condition)}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{readable(item.format)}</dd>
            </div>
          </dl>
          <div className="inspection-chapter">
            <span>
              INSPECT / {String(item.photos.length).padStart(2, "0")} PHOTOS
            </span>
            <i />
            <span>PASS IT ON</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
