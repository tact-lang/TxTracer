import React, {type JSX, useState} from "react"
import {type StackElement} from "ton-assembly/dist/trace"
import {Cell} from "@ton/core"
import {motion, AnimatePresence} from "framer-motion"

import StackItemDetailsModal from "@shared/ui/StackItemDetailsModal/StackItemDetailsModal"

import {CopyButton} from "@shared/CopyButton/CopyButton.tsx"

import styles from "./StackViewer.module.css"

const truncateMiddle = (text: string, maxLength: number = 30): JSX.Element => {
  if (text.length <= maxLength) return <>{text}</>

  const partLength = Math.floor(maxLength / 2)
  const start = text.substring(0, partLength)
  const end = text.substring(text.length - partLength)

  return (
    <span title={text} className={styles.truncatedMiddle}>
      {start}
      <span className={styles.ellipsis}>…</span>
      {end}
    </span>
  )
}

interface StackViewerProps {
  readonly stack: readonly StackElement[]
  readonly title?: string
}

const getElementKey = (element: StackElement, index: number): string => {
  switch (element.$) {
    case "Integer":
      return `int-${element.value}-${index}`
    case "Cell":
      return `cell-${element.boc}-${index}`
    case "Slice":
      return `slice-${element.hex}-${element.startBit}-${element.startRef}-${index}`
    case "Builder":
      return `builder-${element.hex}-${index}`
    case "Continuation":
      return `cont-${element.name}-${index}`
    case "Address":
      return `addr-${element.value}-${index}`
    case "Tuple":
      return `tuple-${index}`
    case "Null":
      return `null-${index}`
    case "NaN":
      return `nan-${index}`
    case "Unknown":
      return `unknown-${index}`
    default:
      return `unknown-fallback-${index}`
  }
}

const safeCellFromHex = (boc: string) => {
  try {
    return Cell.fromHex(boc)
  } catch {
    return new Cell()
  }
}

const safeLoadAddress = (cell: Cell) => {
  try {
    return cell.asSlice().loadAddress()
  } catch {
    return undefined
  }
}

const StackViewer: React.FC<StackViewerProps> = ({stack, title}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedStackItemData, setSelectedStackItemData] = useState<StackElement | null>(null)

  const toggleExpand = (key: string) => {
    setExpandedItem(prev => (prev === key ? null : key))
  }

  const handleOpenDetailsModal = (itemData: StackElement) => {
    setSelectedStackItemData(itemData)
    setIsDetailsModalOpen(true)
    setExpandedItem(null)
  }

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedStackItemData(null)
  }

  const renderStackElement = (
    element: StackElement,
    keyPrefix: string,
    originalIndex: number,
  ): JSX.Element => {
    const handleItemClick = () => {
      switch (element.$) {
        case "Cell":
        case "Slice":
        case "Builder":
        case "Address":
          handleOpenDetailsModal(element)
          break
        default:
          toggleExpand(keyPrefix)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        handleItemClick()
      }
    }

    switch (element.$) {
      case "Null":
        return (
          <div className={styles.nullItem} key={keyPrefix}>
            null
          </div>
        )
      case "NaN":
        return (
          <div className={styles.nanItem} key={keyPrefix}>
            NaN
          </div>
        )
      case "Integer": {
        const value = element.value.toString()
        return (
          <div className={styles.integerItem} key={keyPrefix}>
            {value}
            <CopyButton
              className={styles.integerItemCopyButton}
              title="Copy integer value"
              value={value.toString()}
            />
          </div>
        )
      }
      case "Cell": {
        const cell = safeCellFromHex(element.boc)
        return (
          <div
            className={styles.cellItem}
            key={keyPrefix}
            onClick={handleItemClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className={styles.stackItemLabel}>Cell</div>
            <div className={styles.stackItemValue}>
              {cell.bits.length === 0 && cell.refs.length === 0
                ? "Empty Cell"
                : expandedItem === keyPrefix
                  ? element.boc
                  : truncateMiddle(element.boc, 40)}
              <div className={styles.stackItemDetails}>
                Bits: {cell.bits.length}, Refs: {cell.refs.length}
              </div>
              <CopyButton
                className={styles.cellItemCopyButton}
                title="Copy cell as BoC"
                value={element.boc}
              />
            </div>
          </div>
        )
      }
      case "Slice": {
        const cell = safeCellFromHex(element.hex)

        if (cell.bits.length === 267 && cell.refs.length === 0) {
          const address = safeLoadAddress(cell)
          if (address) {
            const string = address.toRawString()
            const readable = address.toString()
            return (
              <div
                className={styles.addressItem}
                key={keyPrefix}
                onClick={() => handleOpenDetailsModal(element)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") handleOpenDetailsModal(element)
                }}
                role="button"
                tabIndex={0}
              >
                <div className={styles.stackItemLabel}>Address</div>
                <div className={styles.stackItemValue}>
                  {expandedItem === keyPrefix ? string : truncateMiddle(string, 40)}
                </div>
                <CopyButton
                  className={styles.addressItemCopyButton}
                  title="Copy address as base64"
                  value={readable}
                />
              </div>
            )
          }
        }

        return (
          <div
            className={styles.sliceItem}
            key={keyPrefix}
            onClick={handleItemClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className={styles.stackItemLabel}>Slice</div>
            <div className={styles.stackItemValue}>
              {cell.bits.length === 0 && cell.refs.length === 0
                ? "Empty Slice"
                : expandedItem === keyPrefix
                  ? element.hex
                  : truncateMiddle(element.hex, 40)}
              <CopyButton
                className={styles.sliceItemCopyButton}
                title="Copy slice as BoC"
                value={element.hex}
              />
            </div>
            <div className={styles.stackItemDetails}>
              Bits: {element.startBit}-{cell.bits.length}, Refs: {element.startRef}-
              {cell.refs.length}
            </div>
          </div>
        )
      }
      case "Builder": {
        const cell = safeCellFromHex(element.hex)
        return (
          <div
            className={styles.builderItem}
            key={keyPrefix}
            onClick={handleItemClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className={styles.stackItemLabel}>Builder</div>
            <div className={styles.stackItemValue}>
              {cell.bits.length === 0 && cell.refs.length === 0
                ? "Empty Builder"
                : expandedItem === keyPrefix
                  ? element.hex
                  : truncateMiddle(element.hex, 40)}
            </div>
            <div className={styles.stackItemDetails}>
              Bits: {cell.bits.length}, Refs: {cell.refs.length}
            </div>
            <CopyButton
              className={styles.builderItemCopyButton}
              title="Copy builder as BoC"
              value={element.hex}
            />
          </div>
        )
      }
      case "Continuation": {
        return (
          <div
            className={styles.continuationItem}
            key={keyPrefix}
            onClick={() => toggleExpand(keyPrefix)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") toggleExpand(keyPrefix)
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.stackItemLabel}>Continuation</div>
            <div className={styles.stackItemValue}>
              {expandedItem === keyPrefix ? element.name : truncateMiddle(element.name, 40)}
            </div>
            <CopyButton
              className={styles.continuationItemCopyButton}
              title="Copy continuation"
              value={element.name}
            />
            {expandedItem === keyPrefix && (
              <div className={styles.stackItemFullview}>
                <button
                  className={styles.closeBtn}
                  onClick={e => {
                    e.stopPropagation()
                    setExpandedItem(null)
                  }}
                >
                  Collapse
                </button>
              </div>
            )}
          </div>
        )
      }
      case "Address": {
        return (
          <div
            className={styles.addressItem}
            key={keyPrefix}
            onClick={handleItemClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className={styles.stackItemLabel}>Address</div>
            <div className={styles.stackItemValue}>
              {expandedItem === keyPrefix ? element.value : truncateMiddle(element.value, 40)}
            </div>
            <CopyButton
              className={styles.addressItemCopyButton}
              title="Copy address as base64"
              value={element.value}
            />
          </div>
        )
      }
      case "Tuple":
        return (
          <div className={styles.tupleItem} key={keyPrefix}>
            <div className={styles.stackItemLabel}>Tuple</div>
            <div className={styles.stackItems}>
              {element.elements.map((el, i) => {
                const nestedKeyPrefix = `${keyPrefix}-${i}`
                return (
                  <div className={styles.tupleElement} key={nestedKeyPrefix}>
                    {renderStackElement(el, nestedKeyPrefix, originalIndex)}
                  </div>
                )
              })}
            </div>
          </div>
        )
      case "Unknown":
        return (
          <div className={styles.unknownItem} key={keyPrefix} role="button" tabIndex={0}>
            <div className={styles.stackItemLabel}>Unknown</div>
            <div className={styles.stackItemValue}>
              {expandedItem === keyPrefix ? element.value : truncateMiddle(element.value, 40)}
            </div>
          </div>
        )
      default:
        return (
          <div className={styles.stackItem} key={keyPrefix}>
            Unknown element type
          </div>
        )
    }
  }

  const itemVariants = {
    initial: {opacity: 0, y: 20},
    animate: {opacity: 1, y: 0},
    exit: {opacity: 0, y: -20},
  }

  const itemsToRender = stack.map((el, index) => ({
    element: el,
    key: getElementKey(el, index),
    originalIndex: stack.length - 1 - index,
  }))

  return (
    <div className={styles.stackViewer}>
      {title && <h3 className={styles.stackTitle}>{title}</h3>}
      <div className={styles.stackContainer}>
        {itemsToRender.length === 0 ? (
          <div className={styles.emptyStack}>Empty stack</div>
        ) : (
          <div className={styles.stackItems}>
            <AnimatePresence mode="popLayout">
              {[...itemsToRender].reverse().map(({element, key, originalIndex}) => (
                <motion.div
                  key={key}
                  layout
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{type: "spring", stiffness: 300, damping: 30}}
                  className={styles.stackElement}
                >
                  <div className={styles.stackIndex}>{originalIndex}</div>
                  {renderStackElement(element, key, originalIndex)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <StackItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        itemData={selectedStackItemData}
      />
    </div>
  )
}

export default React.memo(StackViewer)
