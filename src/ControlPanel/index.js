import 'firebase/firestore'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { compose, bindActionCreators } from 'redux'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import firebase from './Components/FirebaseProvider/firebase'
import { AnonymousRoutes, LoggedRoutes, AdminRoutes } from './Routes'
import Loading from './Components/Loading'
import {
    setUser,
    checkingUser,
    checkedUser,
    changePath,
} from './Actions'

const firestore = firebase.firestore()
firestore.settings({ timestampsInSnapshots: true })

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        setUser,
        checkingUser,
        checkedUser,
        changePath,
    }, dispatch)
}

const mapStateToProps = (state) => {
    return {
        user: state.controlPanel.user,
        isLoading: state.controlPanel.isLoading
    }
}

class Panel extends Component {
    componentDidMount() {
        this.props.checkingUser()
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const  adminRef = firestore.collection('admins').doc(user.uid)
                adminRef.get().then((doc) => {
                    let rol = 'student'
                    // console.log('DOC: ', user)
                    if (doc.exists)
                        rol = 'admin'
                    this.props.setUser({
                        displayName: user.providerData[0].displayName,
                        email: user.email,
                        picture: user.photoURL,
                        creationTime: user.metadata.creationTime,
                        lastSignInTime: user.metadata.lastSignInTime,
                        uid: user.uid,
                        rol,
                    })
                    this.props.checkedUser()
                    this.props.changePath(this.props.location.pathname)
                }).catch(((error) => console.log('Error when checking user rol: ', error)))
            } else {
                this.props.checkedUser()
                this.props.changePath(this.props.location.pathname)
            }
            
        })
    }

    componentDidUpdate(prevProps){
        if (prevProps.location.pathname !== this.props.location.pathname) {
            this.props.changePath(this.props.location.pathname)
        }
    }

    render() {
        if (this.props.isLoading)
            return <Loading />
        return (
            this.props.user
                ? this.props.user.rol === 'admin' ? <AdminRoutes /> : <LoggedRoutes />
                : <AnonymousRoutes />
        )
    }
}

Panel.propTypes = {
    setUser: PropTypes.func.isRequired,
    checkingUser: PropTypes.func.isRequired,
    checkedUser: PropTypes.func.isRequired,
    changePath: PropTypes.func.isRequired,
    user: PropTypes.any,
}

Panel.defaultProps = {
    user: null,
}

export default compose(
    withRouter,
    connect(mapStateToProps, mapDispatchToProps),
)(Panel)
