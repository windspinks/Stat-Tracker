const router = require("express").Router();
const models = require("../models/stat-tracker-schemas");
const Activities = models.Activities;
const Users = models.Users;
const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;

passport.use(new BasicStrategy(
  function (username, password, done) {
    Users.findOne({username:username}).then(function (user) {
      if (user){
        const userPass = user.password;
        if (!userPass || userPass !== password)
        {return done(null, false);}
        return done(null, username);
      } else {
        return done(null, false);
      }
    });
  }
));

router.use(passport.authenticate("basic", {session:false}));

router.get("/", function (req,res) {
  Activities.find({createdBy:req.user}).then(function (data) {
    if (data){
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(data);
    } else {
      res.status(404).send("No Activities Found");
    }
  }).catch(function (err) {
    console.log(err);
    res.status(500).send("Server error");
  });
});

router.post("/",function(req, res){
  Activities.find().sort({_id:-1}).limit(1)
  .then(function (foundActivity) {
    let newId;
    if (foundActivity[0]){
      newId = foundActivity[0]._id + 1;
    } else {
      newId = 1;
    }

    let newActivity = {
      _id:newId,
      name:req.body.name,
      createdBy:req.user
    };

    if (req.body.description){
      newActivity.description = req.body.description;
    }

    Activities.create(newActivity).then(function (createdActivity) {
      if (createdActivity){
        res.status(201).send("Activity Created Successfully");
      } else {
        res.status(500).send("Error creating activity");
      }
    }).catch(function (err) {
      console.log(err);
      res.status(500).send("Server error");
    });
  });
});

router.get("/:id", function(req, res){
  Activities.findOne({_id:req.params.id, createdBy:req.user}).then(function (foundActivity) {
    if (foundActivity){
      res.setHeader("Content-Type", "application/json");
      res.send(foundActivity);
    } else {
      res.status(404).send("Actvity not found");
    }
  }).catch(function (err) {
    console.log(err);
    res.status(500).send("Server error");
  });
});

router.put("/:id", function(req, res){
  Activities.findOne({_id:req.params.id, createdBy:req.user})
  .then(function(foundActivity){
    if (foundActivity){
      let updatedActivity = {
        _id : req.params.id,
        createdBy: req.user,
        stats: foundActivity.stats
      };

      if (req.body.description)
      {updatedActivity.description = req.body.description;}
      if (req.body.name)
      {updatedActivity.name = req.body.name;}

      Activities.replaceOne({_id:updatedActivity._id}, updatedActivity)
      .then(function (updatedActivity) {
        if (updatedActivity){
          res.status(202).send("Activity updated");
        } else {
          res.status(500).send("Error creating activity");
        }
      }).catch(function (err) {
        console.log(err);
        res.status(500).send("Server error");
      });
    } else {
      res.status(404).send("Activity not found");
    }
  });
});

router.delete("/:id", function(req, res){
  Activities.findOneAndDelete({_id:req.params.id, createdBy:req.user})
  .then(function (activity) {
    if (activity){
      res.status(200).send("Activity deleted successfully");
    } else {
      res.status(500).send("Error deleting activity. Server Error.");
    }
  }).catch(function (err) {
    console.log(err);
    res.status(500).send("Server error");
  });
});

router.post("/:id/stats", function(req, res){
  if (!req.body.date){
    let newDate = new Date();
    req.body.date = (newDate.getMonth() + 1) + "/" + newDate.getDate() +  "/" + newDate.getFullYear();
  }
  if (!req.body.amount)
  {req.body.amount = 0;}

  Activities.findOne({_id:req.params.id, createdby:req.user})
  .then(function (activity) {
    let foundStatIndex;
    for (let i = 0; i < activity.stats.length; i++) {
      if (activity.stats[i].date === req.body.date){
        foundStatIndex = i;
      }
    }

    if (foundStatIndex || foundStatIndex === 0){
      activity.stats[foundStatIndex].amount = req.body.amount;
    } else {
      if (activity.stats.length > 0){
        activity.stats.push({
          _id: activity.stats[activity.stats.length - 1]._id + 1,
          date:req.body.date,
          amount:req.body.amount
        });
      } else {
        activity.stats.push({
          _id: 1,
          date:req.body.date,
          amount:req.body.amount
        });
      }
    }

    Activities.replaceOne({_id:activity.id}, activity).then(function (status) {
      if (status){
        res.status(201).send("Stat created/updated");
      } else {
        res.status(500).send("Error creating stat");
      }
    }).catch(function (err) {
      res.status(500).send("Server Error");
    });
  });
});

router.delete("/:id/stats/:statId", function(req, res){
  Activities.findOne({_id:req.params.id,createdBy:req.user})
  .then(function (activity) {
    for (let i = 0; i < activity.stats.length; i++) {
      if (activity.stats[i]._id === parseInt(req.params.statId)){
        activity.stats.splice(i,1);
      }
    }
    Activities.replaceOne({_id:req.params.id}, activity).then(function (status) {
      if (status){
        res.status(200).send("Stat Deleted");
      } else {
        res.status(500).send("Error deleting stat");
      }
    }).catch(function (err) {
      console.log(err);
      res.status(500).send("Server Error");
    });
  });
});

router.get("/*", function(req, res){
  res.status(404).send("Error, requested resource does not exist");
});

module.exports = router;
