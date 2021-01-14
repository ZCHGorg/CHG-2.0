import React, {useState} from "react";

export const InputSpinner = props => {

    const step = props.step!==undefined ? Number(props.step) : 0.1;
    const digits = props.digits!==undefined ? Number(props.digits) : 1;
    const [value, setValue] = useState(Number(props.value).toFixed(digits));

    React.useEffect(() => {
        setValue(Number(props.value).toFixed(digits));
    },[props.value, digits]);

    const checkValue = newVal => {
        if (props.min!==undefined && newVal < Number(props.min)) {
            newVal = Number(props.min);
        }
        if (props.max!==undefined && newVal > Number(props.max)) {
            newVal = Number(props.max);
        }
        if (typeof props.onChange === 'function') {
            props.onChange(newVal.toFixed(digits));
        }
        return newVal.toFixed(digits);
    }

    const valueChanged = e => {
        setValue(checkValue(Number(e.target.value)));
    }

    const valueIncrement = () => {
        setValue(checkValue(Number(value) + step));
    }

    const valueDecrement = () => {
        setValue(checkValue(Number(value) - step));
    }

    return (
        <div style={{padding: '10px'}}>
            <div className="input-group">
                <div className="input-group-prepend">
                    <button onClick={valueDecrement} className="btn btn-block btn-outline-primary">-</button>
                </div>
                <input
                    type="number" onChange={valueChanged} className="form-control" data-decimals={props.decimals}
                    aria-label={props.placeholder} placeholder={props.placeholder} 
                    min={props.min} max={props.max} step={props.step} value={value}
                />
                <div className="input-group-append">
                    <button onClick={valueIncrement} className="btn btn-block btn-outline-primary">+</button>
                </div>
            </div>
            <div className="input-group">
                <input
                    type="range" onChange={valueChanged} style={{width: "100%"}}
                    min={props.min} max={props.max} step={props.step} value={value}
                />
            </div>
        </div>
    );
}