import React from "react"

import {type StackElement} from "ton-assembly/dist/trace"
import {Cell} from "@ton/core"

import Modal from "@shared/ui/Modal"
import CellTreeView from "@shared/ui/CellTreeView/CellTreeView"
import Icon from "@shared/ui/Icon"
import DataBlock from "@shared/ui/DataBlock"

import styles from "./StackItemDetailsModal.module.css"

interface StackItemDetailsModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly itemData: StackElement | null
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 5L5 15M5 5L15 15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const StackItemDetailsModal: React.FC<StackItemDetailsModalProps> = ({
  isOpen,
  onClose,
  itemData,
}) => {
  if (!isOpen || !itemData) {
    return null
  }

  let cellDetailsContent: React.ReactNode | null = null
  let treeViewContent: React.ReactNode | null = null

  const cellFromItem = (itemData: StackElement) => {
    if (itemData.$ === "Cell" && itemData?.boc) {
      return Cell.fromHex(itemData.boc)
    } else if ((itemData.$ === "Slice" || itemData.$ === "Builder") && itemData?.hex) {
      return Cell.fromHex(itemData.hex)
    }
    return null
  }

  try {
    const rootCell = cellFromItem(itemData)
    if (rootCell) {
      cellDetailsContent = (
        <>
          <div className={styles.dataSection}>
            <DataBlock label="Cell BoC:" data={rootCell.toBoc().toString("hex")} />
          </div>
          <div className={styles.dataSection}>
            <DataBlock
              label="Cell Tree representation:"
              data={rootCell.toString()}
              maxHeight={300}
            />
          </div>
        </>
      )
      treeViewContent = <CellTreeView cell={rootCell} />
    } else {
      treeViewContent = null
      cellDetailsContent = <p>Details for the selected item will be shown here.</p>
    }
  } catch (error) {
    console.error("Error processing item data for modal:", error)
    treeViewContent = null
    cellDetailsContent = <p>Error displaying item details. Data might be malformed.</p>
  }

  return (
    <Modal open={isOpen} onClose={onClose} contentClassName={styles.detailsModalBoxWide}>
      <div className={styles.detailsLayout}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Cell tree</div>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon svg={<CloseIcon />} size={20} />
          </button>
        </div>

        <div className={styles.contentContainer}>
          <div className={styles.leftColumn}>
            <div className={styles.treeViewContainer}>{treeViewContent}</div>
          </div>

          <div className={styles.rightColumn}>{cellDetailsContent}</div>
        </div>
      </div>
    </Modal>
  )
}

export default StackItemDetailsModal
