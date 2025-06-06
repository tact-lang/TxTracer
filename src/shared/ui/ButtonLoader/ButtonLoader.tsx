import React from "react"

import styles from "./ButtonLoader.module.css"

// eslint-disable-next-line functional/type-declaration-immutability
export interface ButtonLoaderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: React.ReactNode
}

const ButtonLoader: React.FC<ButtonLoaderProps> = ({children}) => {
  return (
    <div className={styles.loaderContrainer}>
      <div className={styles.loader}></div>
      {children}
    </div>
  )
}

export default ButtonLoader
