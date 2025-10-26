

const MethodSelector = ({ method, setMethod }) => {
    return (
        <div className="method-selector">
            <button
                onClick={() => setMethod('elo')}
                className={method === 'elo' ? 'active' : ''}
            >
                ELO Method
            </button>
            <button
                onClick={() => setMethod('poisson')}
                className={method === 'poisson' ? 'active' : ''}
            >
                Poisson Method
            </button>
        </div>
    );
};

export default MethodSelector;