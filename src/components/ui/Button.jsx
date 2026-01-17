import styles from './Button.module.css';

export default function Button({
    children,
    variant = 'primary', /* primary, secondary, danger, outline */
    size = 'md', /* sm, md, lg */
    fullWidth = false,
    className = '',
    disabled = false,
    ...props
}) {
    return (
        <button
            className={`
        ${styles.button} 
        ${styles[variant]} 
        ${size !== 'md' ? styles[size] : ''}
        ${fullWidth ? styles.fullWidth : ''} 
        ${className}
      `}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
