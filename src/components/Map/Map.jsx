import React, { Component } from "react";
import {
  Map,
  GoogleApiWrapper,
  Circle,
  InfoWindow,
  Marker
} from "google-maps-react";
import {
  getGeofences,
  newGeofence,
  getClassroomById,
  newClassroom,
  removeCollectionsIfField
} from "../../helpers/queries";
import * as factories from "../../helpers/factories";
import Slider from "@material-ui/core/Slider";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Fab from "@material-ui/core/Fab";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";
import CircularProgress from "@material-ui/core/CircularProgress";

import styles from "./styles";
import DialogForm from "../DialogForm/DialogForm";

const coords = {
  lat: 21.152294,
  lng: -101.711238
};

let responseIdClassroom;


export class MapContainer extends Component {

  constructor(props) {
    super(props);
    this.state = {
      mapCenter:{},
      google: null,
      newGeofence: {
        lenght: 20,
        coordinates: {
          latitude: 0,
          longitude: 0
        }
      },
      geofences: [],
      drawingGeofence: false,
      creatingGeofence: false,
      showingInfoWindow: false,
      activeMarker: {},
      selectedPlace: {},
      dialogForm: {
        open: false
      },
      loading: false,
      error: {
        status: false,
        message: ""
      },
      selectedMarker: {
        title: "Clasroom",
        description: "body"
      }
    };
    this.onMarkerClick = this.onMarkerClick.bind(this);
    // this.onMapClick = this.onMapClick.bind(this);
  }

  /**
   * This method will be called after pressing the Clear Geofence button in geofence drawing mode.
   *  It will remove the geofence added to the map and reset it's state. 
   */
  handleClearGeofence = () => {
    let lstgeofences = this.state.geofences;
    lstgeofences.pop();
    this.setState({
      drawingGeofence: false,
      creatingGeofence: false,
      dialogForm: { open: false },
      newGeofence: {
        lenght: 0,
        coordinates: { latitude: null, longitude: null }
      },
      geofences: lstgeofences,
      newClassroom:{
        courses:[],
      }
    });
  };
  
  /**
   * Event handler after pressing the Save Fab button next to radio slider.
   * It shows the form and hides the slider radio selector by setting the state of creatingGeofence as false.
   **/
  handleClickOpen = () => {
    this.setState({
      drawingGeofence: false,
      creatingGeofence: true,
      dialogForm: { open: true }
    });
  };
  /**
   * Event handler after pressing Cancel button inside Dialog Form modal.
   * It hides the form but keeps the UI ready to modify the new geofence.
   **/
  handleCancel = () => {
    this.setState({
      drawingGeofence: true,
      creatingGeofence: true,
      dialogForm: { open: false }
    });
  };
  /**
   * Event handler after pressing Accept button inside Dialog Form modal.
   * It hides the form but keeps the UI ready to modify the new geofence.
   **/
  res = {};

  handleGeofenceComplete = async(params) => {
    let res = await this.insertClassroom(params);
    this.insertGeofence(res);
    this.setState({
      drawingGeofence: false,
      creatingGeofence: false,
      dialogForm: { open: false },
      //newClassroom:{ courses: params.courses, name: params.name }
    });

  };


  /**
   * This method will be called after pressing the Accept button inside the DialogForm modal.
   *  It will take the state values, generate a proper classroom object 
   *  and send it as parameter to newClassroom method to insert it in firebase.
   */
  insertClassroom = async (params) => {
    let name = params.name;
    let courses = params.courses;
    return await newClassroom(factories.newClassroom(name,courses));
  };
  /**
   *  This method will be called after pressing the Accept button inside the DialogForm modal,
   *  and after the classroom since its needed the clasroom in the database in order to get the right reference.
   * 
   *  It will take the state values, generate a proper geofence object 
   *  and send it as parameter to newGeofence method to insert it in firebase .
   */

  insertGeofence = async (param) => {
    const coordinates = this.state.newGeofence.coordinates;
    const lenght = this.state.newGeofence.lenght;
    const gf = factories.newGeofence(param.id,coordinates.latitude, coordinates.longitude,lenght);
    let res = await newGeofence(gf);
  };

  /**
   * This method calls for the backend bringing the information of the selected marker (class room).
   * @param {string} Id The Id reference we got from the geofence firebase object.
   * @param {object} props Props passed in order to display/hide the InfoWindow.
   */
  getClassroomWithId = async (Id, props) => {
    const { selectedPlace, activeMarker, showingInfoWindow } = props;
    try {
      let res = await getClassroomById(Id);
      let clasroom = res.name;
      // this will re render the view with new data
      this.setState({
        selectedMarker: { description: clasroom, title: "Clasroom" },
        selectedPlace,
        activeMarker,
        showingInfoWindow
      });
    } catch (err) {
      console.log(err);
    }
  };

  /**
   * Called after clicking on a marker.
   *
   * @param {object} props Props passed
   * @param {object} marker the marker itself element
   * @param {object} e Event
   */
  onMarkerClick = (props, marker, e) => {
    const markerState = {
      selectedPlace: props,
      activeMarker: marker,
      showingInfoWindow: true
    };
    this.getClassroomWithId(props.reference, markerState);
  };

  /**
   * Called after clicking on a marker.
   *
   * @param {object} props Props passed
   */

  /**
   * Called before mounting the component Map. It will bring all geofences and save them on the component state.
   **/
  async componentWillMount() {
    const { profesor } = this.props;
    let allgeofences = await getGeofences();
    this.setState({ geofences: allgeofences , profesor});
  }
  async componentWillReceiveProps(props){
    const { profesor } = props;
    //let allgeofences = await getGeofences();
    this.setState({ profesor});
  }
  async delete(){
    let res = await removeCollectionsIfField("classrooms","name","hola");
  }
  render() {
    const { geofences, loading, error } = this.state;
    // let _lat = this.props.profesor.position.latitude;
    // let _lng = this.props.profesor.position.longitude;
    // const _latLng = { _lat, _lng };
    

    if (this.props.google) {
      let latLngProfMarker;
      if(this.state.profesor){
        let lat = this.state.profesor.position.latitude;
        let lng = this.state.profesor.position.longitude;
        latLngProfMarker = { lat, lng };  
      }

      return (
        <div>
          <Map
            google={window.google}
            onReady={this.initMap}
            visible={true}
            initialCenter={coords}
            center={this.state.mapCenter}
            zoom={18}
            onClick={(e, map, c) => {
              //create the geofence add it to state newGeofence
              if (!this.state.drawingGeofence) {
                let geofence = {
                  lenght: 20,
                  coordinates: {
                    latitude: c.latLng.lat(),
                    longitude: c.latLng.lng()
                  }
                };
                let lstGeofences = this.state.geofences;
                lstGeofences.push(geofence);
                this.setState(
                  {
                    newGeofence: geofence,
                    geofences: lstGeofences,
                    drawingGeofence: true
                  }
                );
              }
            }}
            streetViewControl={false}
            zoomControlOptions={{
              position: this.props.google.maps.ControlPosition.RIGHT_TOP
            }}
            yesIWantToUseGoogleMapApiInternals={true}
          >
            {this.state.geofences.map(circle => {
              const { coordinates, lenght } = circle;
              let lat = coordinates.latitude;
              let lng = coordinates.longitude;
              const latLng = { lat, lng };
              return (
                <Circle
                  id="geofence"
                  radius={lenght}
                  center={latLng}
                  strokeColor="red"
                  strokeOpacity={1}
                  strokeWeight={1}
                  fillColor="#FF22FF"
                  fillOpacity={0.3}
                  draggable={false}
                  editable={false}
                ></Circle>
              );
            })}
            { this.state.profesor ? 
           
            (<Marker
                onClick={(props, marker, e)=>{
                  this.setState({
                    mapCenter:{latLngProfMarker},
                    selectedMarker: { description: props.title, title: props.name },
                    selectedPlace: props,
                    activeMarker: marker,
                    showingInfoWindow:true
                  });                            
                }}
                {...this.props}
                position={latLngProfMarker}
                icon={{
                  url:
                    "https://www.showplacerents.com/img/user-placeholder.png",
                  anchor: new this.props.google.maps.Point(16, 16),
                  scaledSize: new this.props.google.maps.Size(32, 32)
                }}
                // reference={classroom.id}
                title = {this.state.profesor.name} //this.state.prop.name
                name={this.state.profesor.role} //string vacio
              />):null
            }

            {this.state.geofences.map(marker => {
              const { classroom = { id: "" }, coordinates } = marker;
              let lat = coordinates.latitude;
              let lng = coordinates.longitude;
              const latLng = { lat, lng };
              return (
                <Marker
                  onClick={this.onMarkerClick}
                  {...this.props}
                  position={latLng}
                  icon={{
                    url:
                      "https://cdn2.iconfinder.com/data/icons/freecns-cumulus/16/519540-077_Location-512.png",
                    anchor: new this.props.google.maps.Point(8, 8),
                    scaledSize: new this.props.google.maps.Size(16, 16)
                  }}
                  reference={classroom.id}
                  title="The marker" //this.state.prop.name
                  name={JSON.stringify(latLng)} //string vacio
                />
              );
            })}
            <InfoWindow
              marker={this.state.activeMarker}
              visible={this.state.showingInfoWindow}
            >
              <Paper>
                <Typography variant="headline" component="h4">
                  {this.state.selectedMarker.title}
                </Typography>
                <Typography component="p">
                  {this.state.selectedMarker.description}
                </Typography>
              </Paper>
            </InfoWindow>
          </Map>
          {this.state.drawingGeofence ? (
            <div style={styles.geofenceForm}>
              <Fab
                style={styles.clearGeofenceButton}
                color="accent"
                aria-label="clear"
                onClick={() => {
                  this.handleClearGeofence();
                }}
              >
                <DeleteIcon />
              </Fab>

              <Paper style={styles.paper}>
                <Slider
                  defaultValue={20}
                  style={styles.slider}
                  aria-labelledby="discrete-slider-custom"
                  step={1}
                  valueLabelDisplay="auto"
                  onChange={(object, value) => {
                    let lstgeofences = this.state.geofences;
                    lstgeofences.pop();
                    const { coordinates } = this.state.newGeofence;
                    const _newGeofence = {
                      lenght: value,
                      coordinates: coordinates
                    };
                    lstgeofences.push(_newGeofence);
                    this.setState({ newGeofence: _newGeofence });
                  }}
                />
                <Typography component="p">Geofence Radius</Typography>
              </Paper>
              <Fab
                style={styles.addGeofenceButton}
                color="secondary"
                aria-label="save"
                onClick={() => {
                  this.handleClickOpen();
                }}
              >
                <SaveIcon />
              </Fab>
            </div>
          ) : null}
          <DialogForm
            open={this.state.dialogForm.open}
            handleCancel={this.handleCancel.bind(this)}
            handleGeofenceComplete={this.handleGeofenceComplete.bind(this)}
          />
        </div>
      );
    } else {
      return <h1>loading google maps...</h1>;
    }
  }
}

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API_KEY
})(MapContainer);
