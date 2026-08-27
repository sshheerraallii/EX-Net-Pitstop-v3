import './SuccessModal.css'

function SuccessModal({ imagePath }) {
  const imageUrl = `/scenarios/${imagePath}`

  return (
    <div className="success-modal">
      <div className="success-content">
        <img
          src={imageUrl}
          alt="Success"
          className="success-image"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      </div>
    </div>
  )
}

export default SuccessModal
